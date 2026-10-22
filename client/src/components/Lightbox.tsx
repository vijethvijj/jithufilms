import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import type { PhotoItem } from "@/data/siteConfig";

interface LightboxProps {
  photos: PhotoItem[];
  activeIndex: number;
  onClose: () => void;
  onChange: (index: number) => void;
}

export default function Lightbox({ photos, activeIndex, onClose, onChange }: LightboxProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const touchStart = useRef<number | null>(null);
  const [announce, setAnnounce] = useState("");
  const photo = photos[activeIndex];

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const handleKeys = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") onChange((activeIndex + 1) % photos.length);
      if (event.key === "ArrowLeft") onChange((activeIndex - 1 + photos.length) % photos.length);
    };
    window.addEventListener("keydown", handleKeys);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", handleKeys);
    };
  }, [activeIndex, onChange, onClose, photos.length]);

  useEffect(() => {
    setAnnounce(`${photo.title}, ${activeIndex + 1} of ${photos.length}`);
  }, [activeIndex, photo.title, photos.length]);

  const move = (direction: -1 | 1) => onChange((activeIndex + direction + photos.length) % photos.length);

  return (
    <div className="lightbox" role="dialog" aria-modal="true" aria-label="Wedding photograph" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }} onTouchStart={event => { touchStart.current = event.touches[0]?.clientX ?? null; }} onTouchEnd={event => {
      const end = event.changedTouches[0]?.clientX;
      if (touchStart.current !== null && end !== undefined && Math.abs(end - touchStart.current) > 44) move(end < touchStart.current ? 1 : -1);
      touchStart.current = null;
    }}>
      <button ref={closeRef} className="lightbox__close icon-button" type="button" onClick={onClose} aria-label="Close photograph"><X size={23} /></button>
      <button className="lightbox__arrow lightbox__arrow--previous icon-button" type="button" onClick={() => move(-1)} aria-label="Previous photograph"><ArrowLeft size={22} /></button>
      <figure className="lightbox__figure">
        <img src={photo.src} alt={photo.alt} />
        <figcaption><span>{photo.category}</span><strong>{photo.title}</strong><p>{photo.caption}</p></figcaption>
      </figure>
      <button className="lightbox__arrow lightbox__arrow--next icon-button" type="button" onClick={() => move(1)} aria-label="Next photograph"><ArrowRight size={22} /></button>
      <span className="lightbox__counter">{String(activeIndex + 1).padStart(2, "0")} / {String(photos.length).padStart(2, "0")}</span>
      <span className="sr-only" aria-live="polite">{announce}</span>
    </div>
  );
}
