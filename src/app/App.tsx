import { Fragment, useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import {
  MapPin,
  Phone,
  Calendar,
  Heart,
  Music,
  Mail,
  Gift,
  Clock,
  Navigation,
  MessageSquare,
  Play,
  Pause,
  X,
} from "lucide-react";
import { PersistentAudioPlayer } from "../components/PersistentAudioPlayer";
import type { AudioControllerHandle, AudioPlaybackState, AudioProgress } from "../components/PersistentAudioPlayer";
import { attendanceOptions, seedWishes } from "../lib/rsvp";
import type { AttendanceStatus, RsvpSubmission } from "../lib/rsvp";

// ─── Constants ────────────────────────────────────────────────────────────────
const musicSrc = "/lagu-pernikahan-kita.mp3";
const musicStartAt = 0;
const musicTimelineOffset = 113;
const musicTitle = "Lagu Pernikahan Kita";
const musicArtist = "Tiara Andini & Arsy Widianto";
const eventDateTime = "2026-11-08T12:00:00+08:00";

const eventDetails = {
  title: "Majlis Perkahwinan Fatin & Arfan",
  dateISO: "2026-11-08",
  dateLabel: "Ahad, 8 November 2026",
  startTime: "12:00",
  endTime: "17:00",
  timeLabel: "12.00 tengah hari - 5.00 petang",
  venueName: "Dewan Semai Bakti Felda Teloi Timur",
  venueAddress: "09300 Kuala Ketil, Kedah",
};

const contacts = [
  { name: "Jeffri", relation: "Bapa Pengantin", phone: "0135895304" },
  { name: "Sarina", relation: "Ibu Pengantin", phone: "0194778469" },
  { name: "Fatin", relation: "Pengantin", phone: "0194013804" },
];

const giftDetails = {
  title: "Hadiah Pengantin",
  recipient: "Fatin Syazwani Binti Jeffri",
  bank: "Hubungi keluarga untuk maklumat hadiah",
  note: "Untuk hadiah atau pertanyaan, sila hubungi pihak keluarga melalui WhatsApp.",
};

const fontStyle = `
  .font-playfair { font-family: 'Playfair Display', Georgia, serif; }
  .font-greatvibes { font-family: 'Great Vibes', cursive; }
  .font-montserrat { font-family: 'Montserrat', sans-serif; }
  html, body { margin: 0; padding: 0; overflow-x: hidden; background: #570f06; }
  ::-webkit-scrollbar { width: 0px; }
`;

type DockPanel = "time" | "location" | "rsvp" | "gift" | "contact" | "music";
type RsvpFormState = { name: string; attendance: AttendanceStatus; pax: number; phone: string; wish: string };
type RsvpApiResponse = { submissions: RsvpSubmission[]; storage: string | null; configured?: boolean };

function AestheticAmpersand() {
  return <span className="aesthetic-ampersand">&amp;</span>;
}

function TextWithAmpersands({ text }: { text: string }) {
  return (
    <>
      {text.split("&").map((part, index) => (
        <Fragment key={`${index}-${part}`}>
          {index > 0 && <AestheticAmpersand />}
          {part}
        </Fragment>
      ))}
    </>
  );
}

function formatMusicTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const wholeSeconds = Math.floor(seconds);
  const minutes = Math.floor(wholeSeconds / 60);
  return `${minutes}:${String(wholeSeconds % 60).padStart(2, "0")}`;
}

const initialForm: RsvpFormState = {
  name: "",
  attendance: "Hadir",
  pax: 1,
  phone: "",
  wish: "",
};

async function parseRsvpResponse(response: Response): Promise<RsvpApiResponse> {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof body.error === "string" ? body.error : "RSVP tidak dapat dihantar.";
    throw new Error(message);
  }
  if (!Array.isArray(body.submissions)) {
    throw new Error("Senarai RSVP tidak dapat dibaca.");
  }
  return body as RsvpApiResponse;
}

async function fetchRsvpSubmissions() {
  const response = await fetch("/api/rsvp", { headers: { Accept: "application/json" } });
  return parseRsvpResponse(response);
}

async function postRsvpSubmission(form: RsvpFormState) {
  const response = await fetch("/api/rsvp", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: form.name,
      attendance: form.attendance,
      pax: form.pax,
      phone: form.phone,
      wish: form.wish,
    }),
  });
  return parseRsvpResponse(response);
}

function malaysiaPhoneLinks(phone: string) {
  const digits = phone.replace(/\D/g, "");
  const international = digits.startsWith("0") ? `60${digits.slice(1)}` : digits;
  return {
    tel: `tel:+${international}`,
    whatsapp: `https://wa.me/${international}`,
  };
}

function calendarDetails() {
  const date = eventDetails.dateISO.replaceAll("-", "");
  const start = eventDetails.startTime.replace(":", "") + "00";
  const end = eventDetails.endTime.replace(":", "") + "00";
  const location = `${eventDetails.venueName}, ${eventDetails.venueAddress}`;
  const google = new URL("https://calendar.google.com/calendar/render");
  google.searchParams.set("action", "TEMPLATE");
  google.searchParams.set("text", eventDetails.title);
  google.searchParams.set("dates", `${date}T${start}/${date}T${end}`);
  google.searchParams.set("location", location);
  google.searchParams.set("details", "Jemputan perkahwinan Fatin Syazwani Binti Jeffri dan Muhammad Arfan Bin Mayiddin.");

  google.searchParams.set("ctz", "Asia/Kuala_Lumpur");
  const escapeIcs = (value: string) => value.replaceAll("\\", "\\\\").replaceAll(";", "\\;").replaceAll(",", "\\,").replaceAll("\n", "\\n");
  const utcTime = (time: string) => new Date(`${eventDetails.dateISO}T${time}:00+08:00`).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Fatin and Arfan//Wedding Invitation//MS",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    "UID:fatin-arfan-20261108@wedding-invitation",
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")}`,
    `DTSTART:${utcTime(eventDetails.startTime)}`,
    `DTEND:${utcTime(eventDetails.endTime)}`,
    `SUMMARY:${escapeIcs(eventDetails.title)}`,
    `LOCATION:${escapeIcs(location)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  return { google: google.toString(), ics };
}

function downloadCalendar() {
  const { ics } = calendarDetails();
  const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "fatin-arfan.ics";
  anchor.click();
  URL.revokeObjectURL(url);
}

function mapLinks() {
  const query = encodeURIComponent(`${eventDetails.venueName}, ${eventDetails.venueAddress}`);
  return {
    google: `https://www.google.com/maps/search/?api=1&query=${query}`,
    waze: `https://waze.com/ul?q=${query}&navigate=yes`,
  };
}

function formatTwoDigits(value: number) {
  return String(value).padStart(2, "0");
}

// ─── Ornament divider ─────────────────────────────────────────────────────────
function OrnamentDivider() {
  return (
    <div className="flex items-center justify-center gap-3 py-2 w-full">
      <div className="h-px flex-1 bg-gradient-to-r from-transparent to-amber-500/30" />
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M10 2C10 2 7 6 4 10C7 14 10 18 10 18C10 18 13 14 16 10C13 6 10 2 10 2Z" stroke="#b8894a" strokeWidth="0.8" fill="none" />
        <circle cx="10" cy="10" r="1.5" fill="#b8894a" />
      </svg>
      <div className="h-px flex-1 bg-gradient-to-l from-transparent to-amber-500/30" />
    </div>
  );
}

// ─── Animated Section ─────────────────────────────────────────────────────────
function AnimatedSection({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: 20 }}
      animate={visible ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

// ─── Entrance Screen ──────────────────────────────────────────────────────────
function EntranceScreen({ onActivate, onEnter, onFinish }: {
  onActivate: () => void; onEnter: () => void; onFinish: () => void;
}) {
  const [opening, setOpening] = useState(false);
  const reduceMotion = useReducedMotion();
  const handleClick = () => {
    if (opening) return;
    onActivate();
    setOpening(true);
    onEnter();
    window.setTimeout(onFinish, reduceMotion ? 300 : 1100);
  };
  return (
    <motion.div className="entrance-screen fixed inset-0 z-50 flex items-center justify-center overflow-hidden"
      animate={{ opacity: opening ? 0 : 1 }} transition={{ duration: reduceMotion ? 0.2 : 0.45, delay: opening && !reduceMotion ? 0.6 : 0 }}>
      {["left", "right"].map((side) => (
        <motion.div key={side} className={"entrance-door entrance-door-" + side}
          animate={{ x: opening ? (side === "left" ? "-100%" : "100%") : 0 }}
          transition={{ duration: reduceMotion ? 0.2 : 0.9, ease: [0.22, 1, 0.36, 1] }} />
      ))}
      <motion.div className="entrance-content relative z-10 text-center"
        animate={{ opacity: opening ? 0 : 1, scale: opening ? 0.9 : 1 }} transition={{ duration: 0.2 }}>
        <p className="entrance-eyebrow font-montserrat">Jemputan Perkahwinan</p>
        <button type="button" onClick={handleClick} disabled={opening}
          className="opening-emblem-button fa-seal" aria-label="Buka kad Fatin dan Arfan">
          <span className="font-greatvibes" aria-hidden="true">F<span className="fa-seal-amp">&amp;</span>A</span>
        </button>
        <h1 className="entrance-names font-greatvibes">Fatin <AestheticAmpersand /> Arfan</h1>
        <p className="entrance-date font-playfair">Ahad, 8 November 2026</p>
        <button type="button" className="entrance-open font-montserrat" onClick={handleClick} disabled={opening}>
          <Mail size={15} aria-hidden="true" /> Buka Jemputan
        </button>
      </motion.div>
    </motion.div>
  );
}

// ─── Cover Page ───────────────────────────────────────────────────────────────
function CoverPage() {
  return (
    <div className="cover-page-shell relative">
      <img src="/Main Page.png" width={1080} height={1920} fetchPriority="high"
        alt="Walimatul Urus Fatin dan Arfan. Ahad, 8 November 2026. Dan kami ciptakan kamu berpasang-pasangan. Surah An-Naba’ 78:8."
        className="cover-art" />
      <a href="#butiran-majlis" className="cover-scroll font-montserrat">Lihat Jemputan <span aria-hidden="true">↓</span></a>
    </div>
  );
}

function WalimatulurusSection() {
  return (
    <AnimatedSection className="invitation-copy-section text-center">
      <h2 className="walimatulurus-title font-greatvibes">Walimatul Urus</h2>
      <p className="invitation-salam" lang="ar" dir="rtl">السَّلَامُ عَلَيْكُمْ</p>
      <p className="invitation-verse font-playfair">Salam dihantar pembuka bicara,<br />Ukiran senyuman tanda mesra.</p>
      <div className="invitation-parents font-playfair">
        <p>Jeffri Bin Mat Jaafar</p>
        <p className="decorative-ampersand"><AestheticAmpersand /></p>
        <p>Sarina Binti Mat Din @ Samsudin</p>
      </div>
      <p className="invitation-copy-line font-playfair">Dengan sukacitanya kami menjemput</p>
      <p className="guest-line font-playfair">Dato’ / Datin / Tuan / Puan / Encik / Cik</p>
      <div className="dotted-gold-divider" aria-hidden="true" />
      <p className="invitation-copy-line font-playfair italic">Suami/isteri serta seisi keluarga ke Majlis Perkahwinan puteri yang dikasihi</p>
      <p className="couple-formal-name font-playfair">Fatin Syazwani Binti Jeffri</p>
      <p className="invitation-copy-line font-playfair italic">dengan pilihan hatinya</p>
      <p className="couple-formal-name font-playfair">Muhammad Arfan Bin Mayiddin</p>
      <OrnamentDivider />
    </AnimatedSection>
  );
}

function DetailsSection() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.15 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  const links = mapLinks();
  return (
    <AnimatedSection className="invitation-section px-6 py-9 text-center">
      <div ref={ref}>
        <motion.p
          className="section-kicker font-montserrat text-xs tracking-widest uppercase font-semibold mb-6"
          style={{ color: "#6e2224" }}
          initial={{ opacity: 0, y: 10 }}
          animate={visible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          Butiran Majlis
        </motion.p>

        <div className="detail-stack space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={visible ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <p className="detail-label font-montserrat text-[10px] tracking-widest uppercase mb-2" style={{ color: "#b8894a" }}>Lokasi</p>
            <p className="detail-value font-playfair text-lg font-bold mb-1" style={{ color: "#6e2224" }}>
              <TextWithAmpersands text={eventDetails.venueName} />
            </p>
            <p className="detail-address font-montserrat text-xs leading-6" style={{ color: "#472220" }}>
              {eventDetails.venueAddress}
            </p>
          </motion.div>

          <div className="h-px w-32 mx-auto bg-gradient-to-r from-transparent via-amber-500/20 to-transparent" />

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={visible ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.25 }}
          >
            <p className="detail-label font-montserrat text-[10px] tracking-widest uppercase mb-2" style={{ color: "#b8894a" }}>Tarikh</p>
            <p className="detail-value font-playfair text-base font-semibold" style={{ color: "#6e2224" }}>{eventDetails.dateLabel}</p>
          </motion.div>

          <div className="h-px w-32 mx-auto bg-gradient-to-r from-transparent via-amber-500/20 to-transparent" />

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={visible ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <p className="detail-label font-montserrat text-[10px] tracking-widest uppercase mb-2" style={{ color: "#b8894a" }}>Masa</p>
            <p className="detail-value font-playfair text-base font-semibold" style={{ color: "#6e2224" }}>{eventDetails.timeLabel}</p>
          </motion.div>
        </div>

        <motion.div
          className="flex justify-center gap-3 mt-8"
          initial={{ opacity: 0, y: 15 }}
          animate={visible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.55 }}
        >
          <a
            href={links.google}
            target="_blank"
            rel="noopener noreferrer"
            className="action-link inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs tracking-wide transition hover:bg-amber-50 active:scale-95 shadow-sm font-semibold"
            style={{ borderColor: "rgba(196,157,96,0.3)", color: "#6e2224", background: "rgba(255,255,255,0.7)" }}
          >
            <MapPin className="w-3.5 h-3.5" />
            Google Maps
          </a>
          <a
            href={links.waze}
            target="_blank"
            rel="noopener noreferrer"
            className="action-link inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs tracking-wide transition hover:bg-amber-50 active:scale-95 shadow-sm font-semibold"
            style={{ borderColor: "rgba(196,157,96,0.3)", color: "#6e2224", background: "rgba(255,255,255,0.7)" }}
          >
            <Navigation className="w-3.5 h-3.5" />
            Waze
          </a>
        </motion.div>
      </div>
    </AnimatedSection>
  );
}

// ─── Countdown Section ────────────────────────────────────────────────────────
function CountdownSection() {
  const [time, setTime] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.2 }
    );
    if (ref.current) observer.observe(ref.current);

    const update = () => {
      const TARGET = new Date(eventDateTime).getTime();
      const diff = TARGET - Date.now();
      if (diff <= 0) { setTime({ days: 0, hours: 0, minutes: 0, seconds: 0 }); return; }
      setTime({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      });
    };
    update();
    const id = setInterval(update, 1000);
    return () => { clearInterval(id); observer.disconnect(); };
  }, []);

  const units = [
    { label: "Hari", value: time.days, key: "d" },
    { label: "Jam", value: time.hours, key: "h" },
    { label: "Minit", value: time.minutes, key: "m" },
    { label: "Saat", value: time.seconds, key: "s" },
  ];

  return (
    <AnimatedSection className="invitation-section px-6 py-10 text-center">
      <div ref={ref}>
        <motion.p
          className="section-kicker font-montserrat text-xs tracking-widest uppercase font-semibold mb-2"
          style={{ color: "#6e2224" }}
          initial={{ opacity: 0 }}
          animate={visible ? { opacity: 1 } : {}}
          transition={{ duration: 0.6 }}
        >
          Menghitung Hari
        </motion.p>
        <motion.p
          className="font-greatvibes text-3xl mb-6"
          style={{ color: "#8a5350" }}
          initial={{ opacity: 0, y: 10 }}
          animate={visible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          Menanti Hari Bahagia
        </motion.p>

        <div className="countdown-grid grid grid-cols-4 gap-2.5">
          {units.map(({ label, value, key }, idx) => (
            <motion.div
              key={label}
              className={`countdown-card rounded-xl py-3 px-1 flex flex-col items-center shadow-sm ${key === "s" ? "seconds-pulse" : ""}`}
              style={{ background: "rgba(255, 255, 255, 0.75)", border: "1px solid rgba(196,157,96,0.15)" }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={visible ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 0.5, delay: 0.2 + idx * 0.1, ease: [0.22, 1, 0.36, 1] }}
            >
              <span className="countdown-number font-playfair text-2xl font-bold leading-none" style={{ color: "#6e2224" }}>
                {formatTwoDigits(value)}
              </span>
              <span className="countdown-label font-montserrat text-[9px] tracking-widest uppercase mt-2 font-semibold" style={{ color: "#8a5350" }}>
                {label}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </AnimatedSection>
  );
}

// ─── Atur Cara Section ────────────────────────────────────────────────────────
function AturCaraSection() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.2 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  const events = [
    { time: "12.00", label: "Majlis Bermula · Tengah Hari" },
    { time: "5.00", label: "Majlis Tamat · Petang" },
  ];

  return (
    <AnimatedSection className="invitation-section px-6 py-10">
      <p className="section-kicker font-montserrat text-xs tracking-widest uppercase font-semibold mb-6 text-center" style={{ color: "#6e2224" }}>
        Atur Cara
      </p>
      <div ref={ref} className="timeline-list space-y-5 relative max-w-xs mx-auto">
        {/* Animated timeline line */}
        <div
          className={`timeline-line absolute left-[4.5rem] top-2 bottom-2 w-px ${visible ? "timeline-line-draw" : ""}`}
          style={{
            background: "linear-gradient(to bottom, transparent, rgba(196,157,96,0.3), transparent)",
            transformOrigin: "top",
            transform: visible ? undefined : "scaleY(0)",
          }}
        />
        {events.map(({ time, label }, idx) => (
          <motion.div
            key={time}
            className="flex items-center gap-4"
            initial={{ opacity: 0, x: -20 }}
            animate={visible ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.5, delay: idx * 0.15, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="timeline-time font-montserrat text-[10px] font-semibold w-16 text-right shrink-0" style={{ color: "#b8894a" }}>{time}</p>
            <div className="w-2 h-2 rounded-full shrink-0 z-10" style={{ background: "#b8894a" }} />
            <p className="timeline-text font-playfair text-xs font-semibold" style={{ color: "#472220" }}>{label}</p>
          </motion.div>
        ))}
      </div>
    </AnimatedSection>
  );
}

// ─── Prayer

function DoaSection() {
  return (
    <AnimatedSection className="invitation-section px-6 py-10 text-center">
      <p className="section-kicker font-montserrat text-xs tracking-widest uppercase font-semibold mb-4" style={{ color: "#6e2224" }}>
        Doa <AestheticAmpersand /> Harapan
      </p>
      <OrnamentDivider />
      <p className="doa-copy font-playfair text-xs leading-7 mt-6 italic" style={{ color: "#472220" }}>
        &quot;Ya Allah, berkatilah perkahwinan ini. Jadikanlah ia perkahwinan yang penuh kasih sayang, kebahagiaan dan keberkatan. Semoga pasangan ini dikurniakan keluarga yang sakinah, mawaddah wa rahmah.&quot;
      </p>
      <div className="mt-6">
        <OrnamentDivider />
      </div>
      <p className="guest-line font-montserrat text-[11px] mt-4 font-semibold" style={{ color: "#8a5350" }}>
        Kehadiran Tuan/Puan amat dihargai. Terima Kasih.
      </p>
    </AnimatedSection>
  );
}

// ─── Sheet Content Components ─────────────────────────────────────────────────
function SheetContent({
  active,
  musicState,
  musicProgress,
  onMusicPlay,
  onMusicPause,
  onMusicSeek,
  rsvpForm,
  rsvpStatus,
  rsvpStatusIsError,
  rsvpAvailable,
  isSubmitting,
  updateRsvpForm,
  submitRsvp,
  wishes,
}: {
  active: DockPanel;
  musicState: AudioPlaybackState;
  musicProgress: AudioProgress;
  onMusicPlay: () => void;
  onMusicPause: () => void;
  onMusicSeek: (seconds: number) => void;
  rsvpForm: RsvpFormState;
  rsvpStatus: string;
  rsvpStatusIsError: boolean;
  rsvpAvailable: boolean;
  isSubmitting: boolean;
  updateRsvpForm: (patch: Partial<RsvpFormState>) => void;
  submitRsvp: (event: React.FormEvent<HTMLFormElement>) => void;
  wishes: RsvpSubmission[];
}) {
  if (active === "time") {
    const calendar = calendarDetails();
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-3 rounded-xl border border-amber-500/10 bg-[#751d1d]/5">
          <Calendar className="w-6 h-6 text-[#751d1d]" />
          <div>
            <strong className="block text-sm text-[#6e2224] font-bold">{eventDetails.dateLabel}</strong>
            <span className="text-xs text-gray-500">{eventDetails.timeLabel}</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={downloadCalendar}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-semibold bg-white hover:bg-gray-50 active:scale-95 transition"
            style={{ color: "#6e2224", borderColor: "rgba(196,157,96,0.25)" }}
          >
            <Calendar className="w-3.5 h-3.5" />
            Muat Turun .ics
          </button>
          <a
            href={calendar.google}
            target="_blank"
            rel="noreferrer"
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-semibold bg-[#751d1d] text-[#fff4d6] hover:brightness-110 active:scale-95 transition"
          >
            <Calendar className="w-3.5 h-3.5" />
            Google Calendar
          </a>
        </div>
      </div>
    );
  }

  if (active === "location") {
    const links = mapLinks();
    return (
      <div className="space-y-4">
        <div className="p-3 rounded-xl border border-amber-500/10 bg-[#751d1d]/5">
          <strong className="block text-sm text-[#6e2224] font-bold">
            <TextWithAmpersands text={eventDetails.venueName} />
          </strong>
          <p className="text-xs text-gray-500 mt-1 leading-5">{eventDetails.venueAddress}</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <a
            href={links.google}
            target="_blank"
            rel="noreferrer"
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-semibold bg-white hover:bg-gray-50 active:scale-95 transition"
            style={{ color: "#6e2224", borderColor: "rgba(196,157,96,0.25)" }}
          >
            <MapPin className="w-3.5 h-3.5" />
            Google Maps
          </a>
          <a
            href={links.waze}
            target="_blank"
            rel="noreferrer"
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-semibold bg-[#751d1d] text-[#fff4d6] hover:brightness-110 active:scale-95 transition"
          >
            <Navigation className="w-3.5 h-3.5" />
            Waze
          </a>
        </div>
      </div>
    );
  }

  if (active === "rsvp") {
    return (
      <div className="space-y-4 overflow-y-auto max-h-[60vh] pr-1">
        <form onSubmit={submitRsvp} className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label htmlFor="rsvp-name" className="block text-[11px] font-bold uppercase tracking-wider mb-1 text-gray-500">Nama</label>
            <input
              required
              id="rsvp-name" name="name" autoComplete="name"
              value={rsvpForm.name}
              maxLength={80}
              placeholder="Nama anda..."
              className="w-full px-3 py-2 rounded-xl border text-sm focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white"
              onChange={(event) => updateRsvpForm({ name: event.target.value })}
            />
          </div>
          <div>
            <label htmlFor="rsvp-attendance" className="block text-[11px] font-bold uppercase tracking-wider mb-1 text-gray-500">Kehadiran</label>
            <select
              id="rsvp-attendance" name="attendance"
              value={rsvpForm.attendance}
              className="w-full px-3 py-2 rounded-xl border text-sm focus:outline-none bg-white"
              onChange={(event) => updateRsvpForm({ attendance: event.target.value as AttendanceStatus })}
            >
              {attendanceOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="rsvp-pax" className="block text-[11px] font-bold uppercase tracking-wider mb-1 text-gray-500">Jumlah pax</label>
            <input
              id="rsvp-pax" name="pax"
              type="number"
              min={1}
              max={10}
              value={rsvpForm.pax}
              className="w-full px-3 py-2 rounded-xl border text-sm focus:outline-none bg-white"
              onChange={(event) => updateRsvpForm({ pax: Math.min(10, Math.max(1, Number(event.target.value) || 1)) })}
            />
          </div>
          <div className="col-span-2">
            <label htmlFor="rsvp-phone" className="block text-[11px] font-bold uppercase tracking-wider mb-1 text-gray-500">No telefon</label>
            <input
              id="rsvp-phone" name="phone" autoComplete="tel"
              type="tel"
              value={rsvpForm.phone}
              maxLength={30}
              placeholder="Contoh: 0191234567"
              className="w-full px-3 py-2 rounded-xl border text-sm focus:outline-none bg-white"
              onChange={(event) => updateRsvpForm({ phone: event.target.value })}
            />
          </div>
          <div className="col-span-2">
            <label htmlFor="rsvp-wish" className="block text-[11px] font-bold uppercase tracking-wider mb-1 text-gray-500">Ucapan</label>
            <textarea
              id="rsvp-wish" name="wish"
              value={rsvpForm.wish}
              maxLength={240}
              rows={3}
              placeholder="Tulis ucapan ringkas..."
              className="w-full px-3 py-2 rounded-xl border text-sm focus:outline-none bg-white"
              onChange={(event) => updateRsvpForm({ wish: event.target.value })}
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="col-span-2 py-2.5 rounded-xl text-xs font-semibold bg-[#751d1d] text-[#fff4d6] disabled:opacity-50 transition active:scale-95"
          >
            {isSubmitting ? "Menyimpan..." : rsvpAvailable ? "Hantar RSVP" : "Teruskan di WhatsApp"}
          </button>
        </form>
        {rsvpStatus && (
          <p
            className={`p-2 text-xs rounded-xl border text-center ${
              rsvpStatusIsError
                ? "border-red-500/20 bg-red-50 text-red-700"
                : "border-green-500/20 bg-green-50 text-green-700"
            }`}
            role={rsvpStatusIsError ? "alert" : "status"}
          >
            {rsvpStatus}
          </p>
        )}

        {!rsvpAvailable && <p className="text-xs leading-relaxed text-center text-gray-600">Sahkan kehadiran dengan Fatin melalui WhatsApp. Sila hantar mesej selepas draf dibuka.</p>}

        {/* Wishes List */}
        <div className="pt-4 border-t border-gray-100">
          <h4 className="text-[11px] font-bold uppercase tracking-wider mb-2 text-gray-400">Ucapan Terbaru</h4>
          <div className="space-y-2.5">
            {wishes.length === 0 && <p className="text-xs text-gray-500">Tiada ucapan buat masa ini.</p>}
            {wishes.slice(0, 4).map((w, idx) => (
              <div key={idx} className="p-2.5 rounded-xl border border-gray-100 bg-gray-50/50 text-xs">
                <p className="italic text-gray-700">&quot;{w.wish || "Semoga majlis berjalan lancar."}&quot;</p>
                <strong className="block text-right text-gray-600 mt-1.5">— {w.name}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (active === "gift") {
    const family = malaysiaPhoneLinks(contacts[0].phone);
    return (
      <div className="space-y-4 text-center">
        <div className="flex flex-col items-center p-4 rounded-xl border border-amber-500/10 bg-[#751d1d]/5">
          <Gift className="w-8 h-8 text-[#751d1d] mb-2" />
          <strong className="block text-base text-[#6e2224] font-bold">{giftDetails.title}</strong>
          <span className="text-xs text-gray-500 mt-1">{giftDetails.recipient}</span>
        </div>
        <div className="p-3 rounded-xl border bg-white shadow-sm text-xs">
          <span className="block text-gray-400 font-semibold mb-1">Bank / DuitNow</span>
          <strong className="text-sm text-[#6e2224] font-bold">{giftDetails.bank}</strong>
          <p className="text-gray-500 mt-2 leading-relaxed">{giftDetails.note}</p>
        </div>
        <a
          href={family.whatsapp}
          target="_blank"
          rel="noreferrer"
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold bg-[#751d1d] text-[#fff4d6] hover:brightness-110 active:scale-95 transition"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          Hubungi Keluarga (WhatsApp)
        </a>
      </div>
    );
  }

  if (active === "contact") {
    return (
      <div className="space-y-2.5">
        {contacts.map((c) => {
          const links = malaysiaPhoneLinks(c.phone);
          return (
            <div key={c.name} className="flex justify-between items-center p-3 rounded-xl border border-gray-100 bg-white shadow-sm">
              <div>
                <strong className="block text-sm text-[#6e2224] font-bold">{c.name}</strong>
                <span className="text-xs text-gray-400 font-semibold">{c.relation} — {c.phone}</span>
              </div>
              <div className="flex gap-2">
                <a
                  href={links.tel}
                  className="w-8 h-8 rounded-full border flex items-center justify-center bg-white hover:bg-gray-50 transition active:scale-90"
                  aria-label={`Panggil ${c.name}`}
                >
                  <Phone className="w-3.5 h-3.5 text-[#751d1d]" />
                </a>
                <a
                  href={links.whatsapp}
                  target="_blank"
                  rel="noreferrer"
                  className="w-8 h-8 rounded-full border flex items-center justify-center bg-white hover:bg-gray-50 transition active:scale-90"
                  aria-label={`WhatsApp ${c.name}`}
                >
                  <MessageSquare className="w-3.5 h-3.5 text-[#751d1d]" />
                </a>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  const musicLabels: Record<AudioPlaybackState, string> = {
    loading: "Memuatkan muzik...",
    ready: "Pemain sedia.",
    playing: "Lagu sedang dimainkan.",
    paused: "Lagu dijeda.",
    blocked: "Autoplay disekat. Tekan Play untuk memulakan lagu.",
    ended: "Lagu telah tamat.",
    error: "Muzik tidak dapat dimuatkan.",
  };

  const duration = Math.max(0, musicProgress.duration);
  const currentTime = Math.min(Math.max(0, musicProgress.currentTime), duration || musicProgress.currentTime);
  const musicUnavailable = musicState === "loading" || musicState === "error";

  return (
    <div className="music-player-panel text-center">
      <div className={`music-artwork ${musicState === "playing" ? "is-playing" : ""}`} aria-hidden="true">
        {musicState === "playing" ? (
          <span className="music-visualizer">
            {[0, 1, 2, 3].map((bar) => <span key={bar} className="music-bar" />)}
          </span>
        ) : (
          <Music className="h-6 w-6" />
        )}
      </div>

      <div>
        <h3 className="music-track-title font-playfair">{musicTitle}</h3>
        <p className="music-track-artist font-montserrat">
          <TextWithAmpersands text={musicArtist} />
        </p>
      </div>

      <div className="music-progress-group">
        <input
          type="range"
          min={0}
          max={duration || 1}
          step={0.5}
          value={duration ? currentTime : 0}
          disabled={!duration}
          onChange={(event) => onMusicSeek(Number(event.target.value))}
          className="music-progress-slider"
          aria-label="Music progress"
          style={{ "--music-progress": `${duration ? (currentTime / duration) * 100 : 0}%` } as React.CSSProperties}
        />
        <div className="music-time-row font-montserrat">
          <span>{formatMusicTime(currentTime + musicTimelineOffset)}</span>
          <span>{formatMusicTime(duration + musicTimelineOffset)}</span>
        </div>
      </div>

      <div className="music-control-row">
        <button
          type="button"
          disabled={musicUnavailable}
          onClick={musicState === "playing" ? onMusicPause : onMusicPlay}
          className="music-play-button"
          aria-label={musicState === "playing" ? "Pause music" : "Play music"}
          title={musicState === "playing" ? "Pause music" : "Play music"}
        >
          {musicState === "playing" ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </button>
        <p className="music-status font-montserrat" role="status">{musicLabels[musicState]}</p>
      </div>
    </div>
  );
}

// ─── Main App Component ───────────────────────────────────────────────────────
export default function App() {
  const [hasEntered, setHasEntered] = useState(false);
  const [showEntrance, setShowEntrance] = useState(true);
  const [active, setActive] = useState<DockPanel | null>(null);
  const [musicState, setMusicState] = useState<AudioPlaybackState>("loading");
  const [musicProgress, setMusicProgress] = useState<AudioProgress>({ currentTime: 0, duration: 0, buffered: 0 });
  const [wishes, setWishes] = useState<RsvpSubmission[]>(seedWishes);
  const [rsvpForm, setRsvpForm] = useState<RsvpFormState>(initialForm);
  const [rsvpStatus, setRsvpStatus] = useState("");
  const [rsvpStatusIsError, setRsvpStatusIsError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rsvpAvailable, setRsvpAvailable] = useState(false);

  const playerRef = useRef<AudioControllerHandle>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const validMusic = true;

  useEffect(() => {
    if (!active) return;
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    const focusableSelector = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]';
    sheetRef.current?.querySelector<HTMLElement>(focusableSelector)?.focus();
    const handleDialogKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setActive(null); return; }
      if (event.key !== "Tab") return;
      const focusable = Array.from(sheetRef.current?.querySelectorAll<HTMLElement>(focusableSelector) ?? []).filter((element) => element.getClientRects().length > 0);
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    window.addEventListener("keydown", handleDialogKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleDialogKey);
      previousFocus?.focus();
    };
  }, [active]);
  const closeSheet = () => setActive(null);

  const openSheet = (panel: DockPanel) => {
    setActive((curr) => (curr === panel ? null : panel));
  };

  const openInvitation = () => {
    setHasEntered(true);
  };

  // Secondary autoplay attempt: retry play after entrance animation if music didn't start
  useEffect(() => {
    if (!hasEntered) return;
    // Give the entrance animation time to complete, then check if music is playing
    const timer = setTimeout(() => {
      if (musicState !== "playing") {
        playerRef.current?.play();
      }
    }, 600);
    return () => clearTimeout(timer);
    // Only run when hasEntered changes, not on musicState changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasEntered]);

  const updateRsvpForm = (patch: Partial<RsvpFormState>) => {
    setRsvpForm((curr) => ({ ...curr, ...patch }));
  };

  const submitRsvp = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setRsvpStatus("");
    setRsvpStatusIsError(false);
    if (!rsvpAvailable) {
      const message = [
        "Assalamualaikum Fatin, saya ingin mengesahkan kehadiran ke majlis Fatin & Arfan pada 8 November 2026.",
        "Nama: " + rsvpForm.name, "Kehadiran: " + rsvpForm.attendance,
        "Jumlah tetamu: " + rsvpForm.pax,
        rsvpForm.phone ? "Telefon: " + rsvpForm.phone : "",
        rsvpForm.wish ? "Ucapan: " + rsvpForm.wish : "",
      ].filter(Boolean).join("\n");
      window.open(malaysiaPhoneLinks(contacts[2].phone).whatsapp + "?text=" + encodeURIComponent(message), "_blank", "noopener,noreferrer");
      setRsvpStatus("Draf RSVP telah dibuka di WhatsApp. Sila hantar mesej untuk mengesahkan kehadiran.");
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await postRsvpSubmission(rsvpForm);
      setWishes(result.submissions.slice(0, 20));
      setRsvpForm(initialForm);
      setRsvpStatus("Terima kasih. RSVP anda telah disimpan dengan selamat.");
    } catch (error) {
      setRsvpStatusIsError(true);
      setRsvpStatus(error instanceof Error ? error.message : "RSVP tidak dapat dihantar.");
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    fetchRsvpSubmissions()
      .then((result) => { setWishes(result.submissions.slice(0, 20)); setRsvpAvailable(result.configured !== false); })
      .catch(() => { setWishes(seedWishes); setRsvpAvailable(false); });
  }, []);

  return (
    <div className="invitation-root relative min-h-screen font-montserrat">
      <style>{fontStyle}</style>

      {/* Hidden persistent audio player */}
      <PersistentAudioPlayer
        ref={playerRef}
        src={musicSrc}
        startAt={musicStartAt}
        onStateChange={setMusicState}
        onProgressChange={setMusicProgress}
      />

      {/* Entrance screen */}
      <AnimatePresence>
        {showEntrance && (
          <EntranceScreen
            onActivate={() => playerRef.current?.play()}
            onEnter={openInvitation}
            onFinish={() => setShowEntrance(false)}
          />
        )}
      </AnimatePresence>

      {/* Main card wrapper */}
      <AnimatePresence>
        {hasEntered && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="relative pb-28 min-h-screen"
          >
            {/* Device-like centered wrapper */}
            <div className="invitation-frame w-full max-w-lg mx-auto sm:my-8 sm:rounded-3xl overflow-hidden shadow-2xl border border-amber-500/15" style={{ minHeight: "100dvh" }}>
              {/* Cover Card */}
              <div className="cover-card relative">
                <CoverPage />
              </div>

              {/* Inner details sections */}
              <div className="invitation-paper">
                <div id="butiran-majlis" className="invitation-letter">
                  <div className="letter-side-lace" aria-hidden="true" />
                <WalimatulurusSection />
                <div className="mx-6 h-px bg-gradient-to-r from-transparent via-amber-500/20 to-transparent" />

                <DetailsSection />
                <div className="letter-contacts font-playfair">
                  <p className="font-greatvibes">Hubungi</p>
                  {contacts.map((contact) => <a key={contact.name} href={malaysiaPhoneLinks(contact.phone).tel}>{contact.name}<span>{contact.phone}</span></a>)}
                </div>
                </div>

                <CountdownSection />
                <div className="mx-6 h-px bg-gradient-to-r from-transparent via-amber-500/20 to-transparent" />

                <AturCaraSection />
                <div className="mx-6 h-px bg-gradient-to-r from-transparent via-amber-500/20 to-transparent" />

                <DoaSection />
              </div>

              {/* Closing Section */}
              <div
                className="closing-section relative py-16 px-6 text-center flex flex-col justify-center overflow-hidden"
                style={{
                  backgroundImage: "url('/Background.png')",
                  backgroundSize: "100% 100%",
                  backgroundPosition: "center",
                  minHeight: "85vh"
                }}
              >
                <div className="absolute inset-0 bg-white/10 z-0 pointer-events-none" />

                {/* Floating hearts */}
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="floating-heart">
                    <Heart className="w-4 h-4" fill="currentColor" />
                  </div>
                ))}

                <div className="closing-composition relative z-10 mx-auto mb-14 flex w-full max-w-sm flex-col items-center text-center">
                  <motion.p
                    className="closing-eyebrow font-montserrat"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.5 }}
                    transition={{ duration: 0.7 }}
                  >
                    Kehadiran Anda Amat Bermakna
                  </motion.p>
                  <motion.h2
                    className="closing-title font-playfair"
                    initial={{ opacity: 0, scale: 0.85, filter: "blur(8px)" }}
                    whileInView={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                    viewport={{ once: true, amount: 0.5 }}
                    transition={{ duration: 0.9, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
                  >
                    RSVP <AestheticAmpersand /> Hadiah
                  </motion.h2>
                  <motion.p
                    className="closing-copy font-playfair"
                    initial={{ opacity: 0, y: 15 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.5 }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                  >
                    Sahkan kehadiran anda dan titipkan ucapan buat pengantin. Kehadiran serta doa anda amat kami hargai.
                  </motion.p>
                  <motion.div
                    className="closing-button-row"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.5 }}
                    transition={{ duration: 0.6, delay: 0.45 }}
                  >
                    <button
                      type="button"
                      onClick={() => openSheet("rsvp")}
                      className="closing-pill-button cta-glow"
                    >
                      <Mail className="h-4 w-4" /> RSVP
                    </button>
                    <button
                      type="button"
                      onClick={() => openSheet("gift")}
                      className="closing-pill-button cta-glow"
                    >
                      <Gift className="h-4 w-4" /> HADIAH
                    </button>
                  </motion.div>
                </div>

                <motion.div
                  className="relative z-10 pt-10 pb-6 text-center border-t border-amber-500/10"
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  whileInView={{ opacity: 1, y: 0, scale: 1 }}
                  viewport={{ once: true, amount: 0.5 }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                >
                  <p className="font-greatvibes text-3xl shimmer-text">Fatin <AestheticAmpersand /> Arfan</p>
                  <p className="font-montserrat text-[10px] tracking-[0.2em] uppercase font-semibold text-gray-500 mt-2">8 November 2026</p>
                </motion.div>
              </div>
            </div>

            {/* Bottom sheets / modals */}
            <AnimatePresence>
              {active && (
                <>
                  {/* Backdrop */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={closeSheet}
                    className="fixed inset-0 z-30 bg-black/30 backdrop-blur-sm"
                  />
                  {/* Modal sheet */}
                  <motion.div
                    initial={{ y: "100%" }}
                    animate={{ y: 0 }}
                    exit={{ y: "100%" }}
                    transition={{ type: "spring", damping: 30, stiffness: 350 }}
                    ref={sheetRef} role="dialog" aria-modal="true" aria-labelledby="sheet-title"
                    className="sheet-panel fixed inset-x-0 bottom-16 z-40 mx-auto max-w-lg rounded-t-3xl p-6 shadow-2xl bg-white/95 backdrop-blur-xl border-t border-amber-500/15"
                  >
                    <div className="w-12 h-1 bg-amber-500/20 rounded-full mx-auto mb-4" />
                    <div className="flex justify-between items-center mb-5">
                      <div>
                        <h2 id="sheet-title" className="text-xl font-bold font-playfair text-[#6e2224]">
                          {active === "time" && <>Tarikh <AestheticAmpersand /> Masa</>}
                          {active === "location" && "Lokasi Majlis"}
                          {active === "rsvp" && "Sahkan RSVP"}
                          {active === "gift" && "Hadiah Digital"}
                          {active === "contact" && "Hubungi Kami"}
                          {active === "music" && "Lagu Pilihan"}
                        </h2>
                      </div>
                      <button
                        onClick={closeSheet}
                        aria-label="Tutup panel"
                        className="w-8 h-8 rounded-full border border-gray-100 flex items-center justify-center bg-gray-50 hover:bg-gray-100 transition"
                      >
                        <X className="w-4 h-4 text-gray-500" />
                      </button>
                    </div>

                    <SheetContent
                      active={active}
                      musicState={musicState}
                      musicProgress={musicProgress}
                      onMusicPlay={() => playerRef.current?.play()}
                      onMusicPause={() => playerRef.current?.pause()}
                      onMusicSeek={(seconds) => playerRef.current?.seek(seconds)}
                      rsvpForm={rsvpForm}
                      rsvpStatus={rsvpStatus}
                      rsvpStatusIsError={rsvpStatusIsError}
                      rsvpAvailable={rsvpAvailable}
                      isSubmitting={isSubmitting}
                      updateRsvpForm={updateRsvpForm}
                      submitRsvp={submitRsvp}
                      wishes={wishes}
                    />
                  </motion.div>
                </>
              )}
            </AnimatePresence>

            {/* Separate floating circular Music dock button */}
            {validMusic && (
              <button
                type="button"
                onClick={() => openSheet("music")}
                aria-label={musicState === "playing" ? "Open music player, currently playing" : "Open music player"}
                title="Music player"
                className={`music-dock fixed right-4 bottom-20 z-40 w-12 h-12 rounded-full flex items-center justify-center bg-[#751d1d] text-[#fff4d6] shadow-lg border border-amber-500/20 transition-all hover:scale-105 active:scale-95 ${
                  active === "music" ? "ring-2 ring-[#fff4d6]" : ""
                }`}
                style={{
                  right: "max(16px, calc((100vw - 512px) / 2 + 16px))"
                }}
              >
                {musicState === "playing" ? (
                  <Music className="w-5 h-5 text-[#fff4d6] animate-pulse" />
                ) : (
                  <Music className="w-5 h-5 text-[#fff4d6] opacity-60" />
                )}
              </button>
            )}

            {/* Fixed bottom navigation dock (Apple-like) */}
            <motion.nav
              className="invitation-dock fixed bottom-3 inset-x-4 z-40 mx-auto max-w-md grid grid-cols-5 gap-1.5 p-2 rounded-full shadow-2xl backdrop-blur-xl border"
              style={{
                background: "rgba(132, 41, 68, 0.95)",
                borderColor: "rgba(255, 244, 217, 0.2)",
                color: "#fff4d6"
              }}
              initial={{ y: 80, opacity: 0, filter: "blur(10px)" }}
              animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
              transition={{ duration: 0.6, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            >
              {[
                { panel: "time", icon: Clock, label: "Masa" },
                { panel: "location", icon: MapPin, label: "Lokasi" },
                { panel: "rsvp", icon: Mail, label: "RSVP" },
                { panel: "gift", icon: Gift, label: "Hadiah" },
                { panel: "contact", icon: Phone, label: "Hubungi" }
              ].map(({ panel, icon: Icon, label }) => (
                <motion.button
                  key={panel}
                  onClick={() => openSheet(panel as DockPanel)}
                  className={`flex flex-col items-center justify-center py-1.5 rounded-full transition-all active:scale-90 ${
                    active === panel ? "bg-amber-500/25 border border-amber-500/25 text-[#fff4d6] font-semibold" : "text-amber-100/70 hover:text-white"
                  }`}
                  whileTap={{ scale: 0.85 }}
                  animate={active === panel ? { y: [0, -4, 0] } : { y: 0 }}
                  transition={active === panel ? { duration: 0.4, ease: "easeOut" } : { duration: 0.2 }}
                >
                  <Icon className="w-4 h-4 mb-0.5" />
                  <span className="text-[9px] tracking-wide uppercase font-semibold">{label}</span>
                </motion.button>
              ))}
            </motion.nav>

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
