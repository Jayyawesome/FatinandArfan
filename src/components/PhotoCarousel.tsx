"use client";

import { useCallback, useEffect, useState } from "react";
import type { KeyboardEvent } from "react";
import Image from "next/image";
import useEmblaCarousel from "embla-carousel-react";
import type { EmblaCarouselType } from "embla-carousel";
import { useReducedMotion } from "motion/react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const photos = [
  { src: "/gallery/wedding-03.jpeg", alt: "Foto landskap Fatin dan Arfan semasa majlis pertunangan", caption: "Fatin & Arfan" },
  { src: "/gallery/wedding-01.jpeg", alt: "Foto potret Fatin dan Arfan semasa majlis pertunangan", caption: "Fatin & Arfan" },
];

export function PhotoCarousel() {
  const reduceMotion = useReducedMotion();
  const [viewportRef, carousel] = useEmblaCarousel({ align: "center", loop: false, duration: reduceMotion ? 0 : 25 });
  const [selected, setSelected] = useState(0);
  const [canPrevious, setCanPrevious] = useState(false);
  const [canNext, setCanNext] = useState(true);

  const updateSelection = useCallback((api: EmblaCarouselType) => {
    setSelected(api.selectedScrollSnap());
    setCanPrevious(api.canScrollPrev());
    setCanNext(api.canScrollNext());
  }, []);

  useEffect(() => {
    if (!carousel) return;
    updateSelection(carousel);
    carousel.on("select", updateSelection).on("reInit", updateSelection);
    return () => { carousel.off("select", updateSelection).off("reInit", updateSelection); };
  }, [carousel, updateSelection]);

  const handleKeyboard = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!carousel || event.target !== event.currentTarget) return;
    if (event.key === "ArrowLeft") { event.preventDefault(); carousel.scrollPrev(Boolean(reduceMotion)); }
    if (event.key === "ArrowRight") { event.preventDefault(); carousel.scrollNext(Boolean(reduceMotion)); }
    if (event.key === "Home") { event.preventDefault(); carousel.scrollTo(0, Boolean(reduceMotion)); }
    if (event.key === "End") { event.preventDefault(); carousel.scrollTo(photos.length - 1, Boolean(reduceMotion)); }
  };

  return (
    <section className="photo-gallery" aria-labelledby="gallery-title" aria-roledescription="karusel">
      <header className="gallery-heading text-center">
        <p className="section-kicker font-montserrat">Momen yang bermakna</p>
        <h2 id="gallery-title" className="font-greatvibes">Majlis Pertunangan</h2>
      </header>
      <div className="gallery-photo-mount">
        <div ref={viewportRef} id="wedding-photo-carousel" className="gallery-viewport" tabIndex={0}
          onKeyDown={handleKeyboard} aria-label="Foto majlis pertunangan Fatin dan Arfan">
          <div className="gallery-track">
            {photos.map((photo, index) => (
              <div key={photo.src} className="gallery-slide" role="group" aria-roledescription="slaid"
                aria-label={`${index + 1} daripada ${photos.length}`} aria-hidden={selected !== index}>
                <div className="gallery-photo">
                  <Image src={photo.src} alt={photo.alt} fill sizes="(max-width: 512px) calc(100vw - 66px), 438px"
                    loading="lazy" quality={85} draggable={false} className="gallery-image" />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="gallery-caption">
          <p className="font-playfair">{photos[selected].caption}</p>
          <span className="gallery-counter font-montserrat" aria-live="polite" aria-atomic="true">
            <span className="sr-only">Foto </span>{String(selected + 1).padStart(2, "0")} <span aria-hidden="true">/</span>
            <span className="sr-only">daripada </span> {String(photos.length).padStart(2, "0")}
          </span>
        </div>
      </div>
      <div className="gallery-controls">
        <button type="button" className="gallery-arrow" disabled={!canPrevious} aria-label="Foto sebelumnya"
          aria-controls="wedding-photo-carousel" onClick={() => carousel?.scrollPrev(Boolean(reduceMotion))}>
          <ChevronLeft size={19} aria-hidden="true" />
        </button>
        <div className="gallery-dots" aria-label="Pilih foto">
          {photos.map((photo, index) => (
            <button key={photo.src} type="button" className={`gallery-dot ${selected === index ? "is-selected" : ""}`}
              aria-label={`Lihat foto ${index + 1}`} aria-current={selected === index ? "true" : undefined}
              aria-controls="wedding-photo-carousel" onClick={() => carousel?.scrollTo(index, Boolean(reduceMotion))}>
              <span aria-hidden="true" />
            </button>
          ))}
        </div>
        <button type="button" className="gallery-arrow" disabled={!canNext} aria-label="Foto seterusnya"
          aria-controls="wedding-photo-carousel" onClick={() => carousel?.scrollNext(Boolean(reduceMotion))}>
          <ChevronRight size={19} aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}
