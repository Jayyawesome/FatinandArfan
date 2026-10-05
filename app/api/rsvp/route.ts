import { NextResponse } from "next/server";
import { attendanceOptions, type AttendanceStatus, type RsvpSubmission } from "@/lib/rsvp";
import { invitationSupabaseConfig } from "@/lib/rsvp-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const storageLocation = "supabase://public.fatin_arfan_rsvps";
const validAttendance = new Set<string>(attendanceOptions);
const noStoreHeaders = { "Cache-Control": "no-store" };

type SubmissionInput = {
  name: string;
  attendance: AttendanceStatus;
  pax: number;
  phone: string;
  wish: string;
};

type PublicWishRow = {
  created_at: string;
  name: string;
  wish: string;
};

type SavedReceiptRow = PublicWishRow & { id: string };

class InputError extends Error {}

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
  return { timestamp: row.created_at, name: row.name, wish: row.wish };
}

async function listPublicWishes(): Promise<RsvpSubmission[]> {
  const rows = await callSupabaseRpc<PublicWishRow[]>("list_fatin_arfan_wishes", { p_limit: 20 });
  return rows.map(publicWish);
}

export async function GET() {
  try {
    const submissions = await listPublicWishes();
    return NextResponse.json(
      { submissions, configured: true, storage: storageLocation },
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

  let receipt: SavedReceiptRow;
  try {
    const rows = await callSupabaseRpc<SavedReceiptRow[]>("submit_fatin_arfan_rsvp", {
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

  const submission = { id: receipt.id, ...publicWish(receipt) };
  let submissions = input.wish ? [publicWish(receipt)] : [];
  try {
    submissions = await listPublicWishes();
  } catch {
    // The insert already succeeded: a wishes refresh must not invite a duplicate RSVP.
    console.error("Wedding RSVP saved; public wishes refresh is unavailable.");
  }

  return NextResponse.json(
    { submission, submissions, configured: true, storage: storageLocation },
    { status: 201, headers: noStoreHeaders },
  );
}
