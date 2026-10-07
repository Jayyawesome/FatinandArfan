const invitationAccessKey = "fa_91b9d21628fe4eada68cf9fdc7adc102";
const attendanceOptions = new Set(["Hadir", "Tidak Hadir", "Mungkin"]);
const headers = { "Content-Type": "application/json", "Cache-Control": "no-store" };
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const timestampPattern = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,6})?(?:Z|([+-])(\d{2}):(\d{2}))$/;

function validTimestamp(value: unknown): value is string {
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

function reply(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers });
}

function clean(value: unknown, maxLength: number, required = false): string {
  if (value !== undefined && value !== null && typeof value !== "string") throw new Error("Input tidak sah.");
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  if ((required && !text) || text.length > maxLength) throw new Error("Input tidak sah.");
  return text;
}

Deno.serve(async (request: Request) => {
  // Custom key grants access to this invitation only, never arbitrary RPCs.
  if (request.headers.get("x-invitation-key") !== invitationAccessKey) {
    return reply({ error: "Akses jemputan tidak sah." }, 401);
  }
  if (request.method !== "POST") return reply({ error: "Kaedah tidak disokong." }, 405);

  let functionName: string;
  let parameters: Record<string, unknown>;
  try {
    const payload = await request.json();
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new Error("Input tidak sah.");
    if (payload.operation === "list") {
      const input = payload.parameters ?? {};
      if (typeof input !== "object" || Array.isArray(input)) throw new Error("Input tidak sah.");
      // Accept the previous invitation route during a rolling website deployment.
      if (input.p_limit !== undefined && input.p_limit !== 20 && input.p_limit !== 101) throw new Error("Input tidak sah.");
      const beforeTimestamp = input.p_before_created_at ?? null;
      const beforeId = input.p_before_id ?? null;
      if (beforeTimestamp !== null || beforeId !== null) {
        if (!validTimestamp(beforeTimestamp) || typeof beforeId !== "string" || !uuidPattern.test(beforeId)) {
          throw new Error("Input tidak sah.");
        }
      }
      functionName = "list_fatin_arfan_wishes_page";
      parameters = { p_limit: 101, p_before_created_at: beforeTimestamp, p_before_id: beforeId };
    } else if (payload.operation === "save") {
      const input = payload.parameters;
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Input tidak sah.");
      const attendance = clean(input.p_attendance, 20, true);
      const pax = input.p_pax;
      if (!attendanceOptions.has(attendance) || typeof pax !== "number" || !Number.isInteger(pax) || pax < 1 || pax > 10) throw new Error("Input tidak sah.");
      functionName = "submit_fatin_arfan_rsvp";
      parameters = {
        p_name: clean(input.p_name, 80, true), p_attendance: attendance, p_pax: pax,
        p_phone: clean(input.p_phone, 30), p_wish: clean(input.p_wish, 240),
      };
    } else {
      return reply({ error: "Operasi tidak disokong." }, 400);
    }
  } catch {
    return reply({ error: "Maklumat RSVP tidak sah." }, 400);
  }

  try {
    const projectUrl = Deno.env.get("SUPABASE_URL");
    const publishableKeys = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") || "{}");
    const databaseKey = publishableKeys.default || Deno.env.get("SUPABASE_ANON_KEY");
    if (!projectUrl || !databaseKey) return reply({ error: "Perkhidmatan RSVP belum tersedia." }, 503);
    const response = await fetch(projectUrl + "/rest/v1/rpc/" + functionName, {
      method: "POST", headers: { apikey: databaseKey, "Content-Type": "application/json" },
      body: JSON.stringify(parameters), signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) {
      console.error("Invitation RSVP database request failed", response.status);
      return reply({ error: "RSVP tidak dapat disimpan. Sila cuba lagi." }, 503);
    }
    const rows = await response.json();
    if (!Array.isArray(rows)) return reply({ error: "Respons RSVP tidak sah." }, 503);
    const publicRows = rows.map((row) => {
      if (!row || typeof row.id !== "string" || !uuidPattern.test(row.id)
        || !validTimestamp(row.created_at) || typeof row.name !== "string" || typeof row.wish !== "string") {
        throw new Error("Unexpected public RSVP row.");
      }
      return { id: row.id, created_at: row.created_at, name: row.name, wish: row.wish };
    });
    return reply(publicRows);
  } catch {
    console.error("Invitation RSVP service request failed");
    return reply({ error: "Perkhidmatan RSVP tidak dapat dihubungi. Sila cuba lagi." }, 503);
  }
});
