"use client";

import { Heart, LoaderCircle, Mail, RefreshCw } from "lucide-react";
import type { RsvpSubmission } from "../lib/rsvp";

type GuestWishesProps = {
  wishes: RsvpSubmission[];
  isLoading: boolean;
  error: string;
  onRetry: () => void;
  onRsvp: () => void;
};

function wishDate(timestamp: string) {
  const date = new Date(timestamp);
  if (!Number.isFinite(date.getTime())) return "";
  return new Intl.DateTimeFormat("ms-MY", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kuala_Lumpur" }).format(date);
}

export function GuestWishes({ wishes, isLoading, error, onRetry, onRsvp }: GuestWishesProps) {
  const publishedWishes = wishes.filter((wish) => wish.wish.trim());
  return (
    <section id="ucapan-tetamu" className="guest-wishes-section" aria-labelledby="guest-wishes-title" tabIndex={-1}>
      <header className="guest-wishes-header text-center">
        <Heart className="guest-wishes-heart" size={19} aria-hidden="true" />
        <p className="section-kicker font-montserrat">Buat Fatin &amp; Arfan</p>
        <h2 id="guest-wishes-title" className="font-playfair">Doa &amp; Ucapan</h2>
        <p className="guest-wishes-intro font-playfair">Titipan doa dan kata-kata indah daripada insan tersayang.</p>
        <button type="button" className="guest-wishes-compose font-montserrat" onClick={onRsvp}>
          <Mail size={15} aria-hidden="true" /> Titipkan ucapan
        </button>
      </header>

      {isLoading && publishedWishes.length === 0 && (
        <p className="guest-wishes-status" role="status"><LoaderCircle size={18} className="animate-spin" aria-hidden="true" /> Memuatkan ucapan...</p>
      )}
      {error && (
        <div className="guest-wishes-error" role="alert">
          <p>{error}</p>
          <button type="button" onClick={onRetry} disabled={isLoading}><RefreshCw size={14} aria-hidden="true" /> Cuba lagi</button>
        </div>
      )}
      {!isLoading && !error && publishedWishes.length === 0 && (
        <p className="guest-wishes-empty font-playfair">Belum ada ucapan. Jadilah yang pertama menitipkan doa buat pengantin.</p>
      )}

      {publishedWishes.length > 0 && (
        <>
          <p className="guest-wishes-count font-montserrat" aria-live="polite" aria-atomic="true">{publishedWishes.length} ucapan dititipkan</p>
          <ol className="guest-wishes-feed">
            {publishedWishes.map((wish) => {
              const date = wishDate(wish.timestamp);
              return (
                <li key={wish.id}>
                  <blockquote className="guest-wish-card">
                    <span className="guest-wish-quote font-playfair" aria-hidden="true">&ldquo;</span>
                    <p className="guest-wish-copy font-playfair">{wish.wish}</p>
                    <footer>
                      <cite className="font-montserrat">{wish.name}</cite>
                      {date && <time dateTime={wish.timestamp} className="font-montserrat">{date}</time>}
                    </footer>
                  </blockquote>
                </li>
              );
            })}
          </ol>
        </>
      )}
      {isLoading && publishedWishes.length > 0 && <p className="guest-wishes-refresh" role="status">Menyemak ucapan terkini...</p>}
      <div className="guest-wishes-end" aria-hidden="true"><span /><Heart size={12} /><span /></div>
    </section>
  );
}
