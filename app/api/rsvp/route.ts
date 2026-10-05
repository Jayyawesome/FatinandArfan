import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const storageLocation = "supabase://public.rsvp_submissions";
const attendanceOptions = new Set(["Hadir", "Tidak Hadir", "Mungkin"]);
const noStoreHeaders = { "Cache-Control": "no-store" };

type Submission = {
  timestamp: string;
  name: string;
  attendance: string;
  pax: number;
  phone: string;
  wish: string;
  source: string;
};

type PublicSubmissionRow = {
  created_at: string;
  name: string;
  attendance: string;
  pax: number;
  wish: string;
  source: string;
};

class InputError extends Error {}

function cleanString(value: unknown, maxLength: number, label: string, required = false) {
  const normalized = String(value ?? "").replace(/\s+/g, " ").trim();
  if (required && normalized.length === 0) throw new InputError(`${label} diperlukan.`);
  if (normalized.length > maxLength) throw new InputError(`${label} mesti ${maxLength} aksara atau kurang.`);
  return normalized;
}

function normalizeSubmissionInput(body: Record<string, unknown>): Omit<Submission, "timestamp" | "source"> {
  const name = cleanString(body.name, 80, "Nama", true);
  const phone = cleanString(body.phone, 30, "No telefon");
  const wish = cleanString(body.wish, 240, "Ucapan");
  const attendance = cleanString(body.attendance, 20, "Kehadiran", true);
  if (!attendanceOptions.has(attendance)) throw new InputError("Pilihan kehadiran tidak sah.");

  const pax = Number(body.pax);
  if (!Number.isInteger(pax) || pax < 1 || pax > 10) {
    throw new InputError("Jumlah pax mesti antara 1 hingga 10.");
  }

  return { name, attendance, pax, phone, wish };
}

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    return null;
  }

  return { url: url.replace(/\/$/, ""), key };
}

async function callSupabaseRpc<T>(functionName: string, parameters: Record<string, unknown>): Promise<T> {
  const config = getSupabaseConfig();
  if (!config) throw new Error("Supabase environment variables are not configured.");
  const { url, key } = config;
  const response = await fetch(`${url}/rest/v1/rpc/${functionName}`, {
    method: "POST",
    headers: {
      apikey: key,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(parameters),
    cache: "no-store",
  });

  const responseText = await response.text();
  if (!response.ok) {
    throw new Error(`Supabase RPC ${functionName} failed with status ${response.status}.`);
  }

  return (responseText ? JSON.parse(responseText) : null) as T;
}

async function listPublicSubmissions(): Promise<Submission[]> {
  const rows = await callSupabaseRpc<PublicSubmissionRow[]>("list_public_rsvps", { p_limit: 20 });
  return rows.map((row) => ({
    timestamp: row.created_at,
    name: row.name,
    attendance: row.attendance,
    pax: row.pax,
    phone: "",
    wish: row.wish,
    source: row.source,
  }));
}

export async function GET() {
  if (!getSupabaseConfig()) {
    return NextResponse.json(
      { submissions: [], configured: false, storage: null },
      { headers: noStoreHeaders },
    );
  }

  try {
    const submissions = await listPublicSubmissions();
    return NextResponse.json(
      { submissions, configured: true, storage: storageLocation },
      { headers: noStoreHeaders },
    );
  } catch (error) {
    console.error("Unable to read RSVP submissions from Supabase.", error);
    return NextResponse.json(
      { error: "Senarai RSVP tidak dapat dibaca." },
      { status: 503, headers: noStoreHeaders },
    );
  }
}

export async function POST(request: Request) {
  if (!getSupabaseConfig()) {
    return NextResponse.json(
      { error: "RSVP dalam talian belum tersedia. Sila hubungi Fatin melalui WhatsApp untuk mengesahkan kehadiran." },
      { status: 503, headers: noStoreHeaders },
    );
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const input = normalizeSubmissionInput(body);
    await callSupabaseRpc<null>("submit_rsvp", {
      p_name: input.name,
      p_attendance: input.attendance,
      p_pax: input.pax,
      p_phone: input.phone,
      p_wish: input.wish,
    });

    const submission: Submission = {
      timestamp: new Date().toISOString(),
      ...input,
      source: "Supabase RSVP API",
    };
    const submissions = await listPublicSubmissions();

    return NextResponse.json(
      { submission, submissions, configured: true, storage: storageLocation },
      { status: 201, headers: noStoreHeaders },
    );
  } catch (error) {
    const isInputError = error instanceof InputError;
    if (!isInputError) console.error("Unable to store RSVP submission in Supabase.", error);

    return NextResponse.json(
      { error: isInputError ? error.message : "RSVP tidak dapat disimpan. Sila cuba lagi." },
      { status: isInputError ? 400 : 503, headers: noStoreHeaders },
    );
  }
}
