export function parseYouTubeId(input: string): string | null {
  try {
    const url = new URL(input);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    let id = "";
    if (host === "youtu.be") id = url.pathname.split("/").filter(Boolean)[0] ?? "";
    if (["youtube.com", "m.youtube.com", "music.youtube.com", "youtube-nocookie.com"].includes(host)) {
      if (url.pathname === "/watch") id = url.searchParams.get("v") ?? "";
      else if (/^\/(embed|shorts)\//.test(url.pathname)) id = url.pathname.split("/")[2] ?? "";
    }
    return /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
  } catch { return null; }
}

export function parseTimestamp(value: string): number | null {
  const match = /^(\d{1,3}):([0-5]\d)$/.exec(value.trim());
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

export function formatTimestamp(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
}

export function parseCoordinates(value: string): { latitude: number; longitude: number } | null {
  const match = /^\s*(-?(?:\d+(?:\.\d+)?))\s*,\s*(-?(?:\d+(?:\.\d+)?))\s*$/.exec(value);
  if (!match) return null;
  const latitude = Number(match[1]);
  const longitude = Number(match[2]);
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
  return { latitude, longitude };
}

function isHttpsHost(value: string, hosts: string[]) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && hosts.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`));
  } catch { return false; }
}

export function buildNavigationUrls(googleMapsUrl: string, wazeUrl: string, coordinate: string) {
  const parsed = parseCoordinates(coordinate);
  const encoded = parsed ? encodeURIComponent(`${parsed.latitude},${parsed.longitude}`) : "";
  return {
    google: isHttpsHost(googleMapsUrl, ["google.com", "goo.gl"]) ? googleMapsUrl : parsed ? `https://www.google.com/maps/search/?api=1&query=${encoded}` : null,
    waze: isHttpsHost(wazeUrl, ["waze.com"]) ? wazeUrl : parsed ? `https://waze.com/ul?ll=${encoded}&navigate=yes` : null,
  };
}

export function normalizePhone(value: string) {
  const hasPlus = value.trim().startsWith("+");
  const digits = value.replace(/\D/g, "");
  const valid = digits.length >= 8 && digits.length <= 15;
  return {
    digits,
    valid,
    telUrl: valid ? `tel:${hasPlus ? "+" : ""}${digits}` : null,
    whatsappUrl: valid ? `https://wa.me/${digits}` : null,
  };
}

export function formatEventTime(start: string, end: string): string {
  const format = (time: string) => {
    const [hours, minutes] = time.split(":").map(Number);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return "";
    const period = hours >= 12 ? "PM" : "AM";
    return `${hours % 12 || 12}:${String(minutes).padStart(2, "0")} ${period}`;
  };
  const startLabel = format(start);
  const endLabel = format(end);
  return [startLabel, endLabel].filter(Boolean).join(" - ");
}

export function isValidTimeRange(start: string, end: string) {
  if (!start || !end) return true;
  return start < end;
}

export function uid(prefix: string) {
  return `${prefix}-${globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)}`;
}
