import { parseTimestamp, parseYouTubeId } from "./helpers";

export function buildYouTubeEmbedUrl(youtubeUrl: string, startAt: string, endAt: string, autoplay: boolean) {
  const videoId = parseYouTubeId(youtubeUrl);
  if (!videoId) return "";
  const start = parseTimestamp(startAt) ?? 0;
  const end = endAt ? parseTimestamp(endAt) : null;
  const params = new URLSearchParams({
    start: String(start),
    playsinline: "1",
    rel: "0",
  });
  if (end !== null && end > start) params.set("end", String(end));
  if (autoplay) {
    params.set("autoplay", "1");
    params.set("mute", "0");
  }
  return `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`;
}

export function shouldAttemptAutoplay(opened: boolean, autoplayEnabled: boolean, hasValidVideo: boolean) {
  return opened && autoplayEnabled && hasValidVideo;
}

export function buildYouTubeControllerUrl(youtubeUrl: string, startAt: string, endAt: string) {
  const videoId = parseYouTubeId(youtubeUrl);
  if (!videoId) return "";
  const start = parseTimestamp(startAt) ?? 0;
  const end = endAt ? parseTimestamp(endAt) : null;
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const params = new URLSearchParams({
    enablejsapi: "1",
    playsinline: "1",
    rel: "0",
    start: String(start),
    autoplay: "0",
    ...(origin ? { origin } : {}),
  });
  if (end !== null && end > start) params.set("end", String(end));
  return `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`;
}
