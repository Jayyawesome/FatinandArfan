import { NextResponse } from "next/server";
import { attendanceOptions, type AttendanceStatus, type RsvpSubmission } from "@/lib/rsvp";
import { invitationSupabaseConfig } from "@/lib/rsvp-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const storageLocation = "supabase://public.fatin_arfan_rsvps";
const validAttendance = new Set<string>(attendanceOptions);
const noStoreHeaders = { "Cache-Control": "no-store" };
const wishesPageSize = 100;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const timestampPattern = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,6})?(?:Z|([+-])(\d{2}):(\d{2}))$/;

type SubmissionInput = {
  name: string;
  attendance: AttendanceStatus;
  pax: number;
  phone: string;
  wish: string;
};

type PublicWishRow = {
  id: string;
  created_at: string;
  name: string;
  wish: string;
};

type WishesCursor = { timestamp: string; id: string };
type WishesPage = { submissions: RsvpSubmission[]; nextCursor: string | null };

class InputError extends Error {}

function isValidCursorTimestamp(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const match = timestampPattern.exec(value);
  if (!match || !Number.isFinite(Date.parse(value))) return false;
  const [, year, month, day, hour, minute, second, , offsetHour, offsetMinute] = match;
  if (Number(hour) > 23 || Number(minute) > 59 || Number(second) > 59) return false;
  if (offsetHour !== undefined && (Number(offsetHour) > 15 || Number(offsetMinute) > 59)) return false;
  const calendarDate = new Date(`${year}-${month}-${day}T00:00:00Z`);
  return calendarDate.getUTCFullYear() === Number(year)
    && calendarDate.getUTCMonth() + 1 === Number(month)
    && calendarDate.getUTCDate() === Number(day);
}

function decodeWishesCursor(value: string | null): WishesCursor | null {
  if (value === null) return null;
  try {
    if (value.length > 256 || !/^[A-Za-z0-9_-]+$/.test(value)) throw new Error();
    const bytes = Buffer.from(value, "base64url");
    if (bytes.toString("base64url") !== value) throw new Error();
    const cursor = JSON.parse(bytes.toString("utf8")) as unknown;
    if (!cursor || typeof cursor !== "object" || Array.isArray(cursor)) throw new Error();
    const fields = cursor as Record<string, unknown>;
    if (Object.keys(fields).length !== 2 || !isValidCursorTimestamp(fields.timestamp)
      || typeof fields.id !== "string" || !uuidPattern.test(fields.id)) throw new Error();
    // Preserve Postgres microseconds exactly; Date.parse above is only validation.
    return { timestamp: fields.timestamp, id: fields.id };
  } catch {
    throw new InputError("Penanda ucapan tidak sah. Sila muat semula kad.");
  }
}

function encodeWishesCursor(row: PublicWishRow) {
  return Buffer.from(JSON.stringify({ timestamp: row.created_at, id: row.id }), "utf8").toString("base64url");
}

function cleanString(value: unknown, maxLength: number, label: string, required = false) {
  if (value != null && typeof value !== "string") {
    throw new InputError(`${label} tidak sah.`);
  }
  const normalized = (value ?? "").replace(/\s+/g, " ").trim();
  if (required && normalized.length === 0) throw new InputError(`${label} diperlukan.`);
  if (normalized.length > maxLength) throw new InputError(`${label} mesti ${maxLength} aksara atau kurang.`);
  return normalized;
}

function normalizeSubmissionInput(body: unknown): SubmissionInput {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new InputError("Maklumat RSVP tidak sah.");
  }

  const fields = body as Record<string, unknown>;
  const name = cleanString(fields.name, 80, "Nama", true);
  const phone = cleanString(fields.phone, 30, "No telefon");
  const wish = cleanString(fields.wish, 240, "Ucapan");
  const attendance = cleanString(fields.attendance, 20, "Kehadiran", true);
  if (!validAttendance.has(attendance)) throw new InputError("Pilihan kehadiran tidak sah.");

  const pax = fields.pax;
  if (typeof pax !== "number" || !Number.isInteger(pax) || pax < 1 || pax > 10) {
    throw new InputError("Jumlah tetamu mesti antara 1 hingga 10.");
  }

  return { name, attendance: attendance as AttendanceStatus, pax, phone, wish };
}

function getRsvpConfig() {
  const url = process.env.RSVP_API_URL?.trim() || invitationSupabaseConfig.endpointUrl;
  const key = process.env.RSVP_API_KEY?.trim() || invitationSupabaseConfig.accessKey;

  return url && key ? { url: url.replace(/\/$/, ""), key } : null;
}

async function callSupabaseRpc<T>(functionName: string, parameters: Record<string, unknown>): Promise<T> {
  const config = getRsvpConfig();
  if (!config) throw new Error("RSVP storage is unavailable.");

  const response = await fetch(config.url, {
    method: "POST",
    headers: {
      "x-invitation-key": config.key,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      operation: functionName === "submit_fatin_arfan_rsvp" ? "save" : "list",
      parameters,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    throw new Error("RSVP storage request failed.");
  }

  return await response.json() as T;
}

function publicWish(row: PublicWishRow): RsvpSubmission {
  return { id: row.id, timestamp: row.created_at, name: row.name, wish: row.wish };
}

async function listPublicWishes(cursor: WishesCursor | null = null): Promise<WishesPage> {
  const rows = await callSupabaseRpc<PublicWishRow[]>("list_fatin_arfan_wishes_page", {
    p_limit: wishesPageSize + 1,
    p_before_created_at: cursor?.timestamp ?? null,
    p_before_id: cursor?.id ?? null,
  });
  const page = rows.slice(0, wishesPageSize);
  return {
    submissions: page.map(publicWish),
    nextCursor: rows.length > wishesPageSize ? encodeWishesCursor(page[page.length - 1]) : null,
  };
}

export async function GET(request: Request) {
  let cursor: WishesCursor | null;
  try {
    const search = new URL(request.url).searchParams;
    if (search.getAll("cursor").length > 1) throw new InputError("Penanda ucapan tidak sah. Sila muat semula kad.");
    cursor = decodeWishesCursor(search.get("cursor"));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof InputError ? error.message : "Penanda ucapan tidak sah. Sila muat semula kad." },
      { status: 400, headers: noStoreHeaders },
    );
  }
  try {
    const page = await listPublicWishes(cursor);
    return NextResponse.json(
      { ...page, configured: true, storage: storageLocation },
      { headers: noStoreHeaders },
    );
  } catch {
    console.error("Unable to read public wedding wishes.");
    return NextResponse.json(
      { error: "Ucapan tetamu tidak dapat dimuatkan. Sila cuba lagi.", configured: false },
      { status: 503, headers: noStoreHeaders },
    );
  }
}

export async function POST(request: Request) {
  let input: SubmissionInput;
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new InputError("Maklumat RSVP tidak sah.");
    }
    input = normalizeSubmissionInput(body);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof InputError ? error.message : "Maklumat RSVP tidak sah." },
      { status: 400, headers: noStoreHeaders },
    );
  }

  let receipt: PublicWishRow;
  try {
    const rows = await callSupabaseRpc<PublicWishRow[]>("submit_fatin_arfan_rsvp", {
      p_name: input.name,
      p_attendance: input.attendance,
      p_pax: input.pax,
      p_phone: input.phone,
      p_wish: input.wish,
    });
    if (!rows[0]) throw new Error("No saved RSVP receipt was returned.");
    receipt = rows[0];
  } catch {
    console.error("Unable to save wedding RSVP.");
    return NextResponse.json(
      { error: "RSVP tidak dapat disimpan. Sila cuba lagi." },
      { status: 503, headers: noStoreHeaders },
    );
  }

  const submission = publicWish(receipt);
  let page: WishesPage = { submissions: input.wish ? [submission] : [], nextCursor: null };
  try {
    page = await listPublicWishes();
  } catch {
    // The insert already succeeded: a wishes refresh must not invite a duplicate RSVP.
    console.error("Wedding RSVP saved; public wishes refresh is unavailable.");
  }

  return NextResponse.json(
    { submission, ...page, configured: true, storage: storageLocation },
    { status: 201, headers: noStoreHeaders },
  );
}
