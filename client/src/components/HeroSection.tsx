import { useState, type CSSProperties, type PointerEvent } from "react";
import { ArrowDown, ArrowUpRight, Focus } from "lucide-react";
import { useGalleryPhotos } from "@/hooks/useGalleryPhotos";
import { photoCollagePlacements } from "@/data/photoCollage";
import Lightbox from "./Lightbox";

export default function HeroSection() {
  const galleryPhotos = useGalleryPhotos();
  const [pointer, setPointer] = useState({ x: 0.5, y: 0.5, active: false });
  const [touchSpread, setTouchSpread] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const photos = galleryPhotos.filter(photo => photo.isIntro).slice(0, 8);
  const spread = pointer.active || touchSpread;

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches)
      return;
    const rect = event.currentTarget.getBoundingClientRect();
    setPointer({
      x: Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height)),
      active: true,
    });
  };

  return (
    <section className="hero-section" id="home" aria-labelledby="hero-title">
      <div className="hero-section__grain" aria-hidden="true" />
      <div className="hero-section__inner page-shell">
        <div className="hero-copy">
          <p className="eyebrow">
            <span className="eyebrow__rule" /> Wedding Photography &amp;
            Cinematography
          </p>
          <h1 id="hero-title">
            Every Frame
            <br />
            <em>Tells a Story.</em>
          </h1>
          <p className="hero-copy__intro">
            We capture the emotions, the little moments, and the memories that
            last forever.
          </p>
          <div className="hero-copy__actions">
            <a className="button button--dark" href="#gallery">
              Explore Our Gallery <ArrowUpRight size={16} strokeWidth={1.6} />
            </a>
            <a className="text-link" href="#contact">
              Book Your Date <span aria-hidden="true">↗</span>
            </a>
          </div>
          <div className="hero-copy__note">
            <span className="hero-copy__note-line" /> Real moments, thoughtfully
            remembered
          </div>
        </div>

        <div
          className={`hero-photo-area${spread ? " hero-photo-area--active" : ""}`}
        >
          <div
            className="photo-stack"
            onPointerEnter={() =>
              setPointer(current => ({ ...current, active: true }))
            }
            onPointerMove={handlePointerMove}
            onPointerLeave={() =>
              setPointer(current => ({ ...current, active: false }))
            }
            style={{ "--spread": spread ? 1 : 0 } as CSSProperties}
            aria-label="A stack of wedding photographs. Move the pointer to spread the photographs."
          >
            {photos.map((photo, index) => {
              const placement = photoCollagePlacements[index];
              const proximity =
                1 -
                Math.min(
                  1,
                  Math.hypot(
                    pointer.x - 0.5 - ((index % 3) - 1) * 0.15,
                    pointer.y - 0.5 - (Math.floor(index / 3) - 1) * 0.14
                  ) * 1.6
                );
              const pull = spread ? 0.34 + proximity * 0.72 : 0;
              const x = spread
                ? placement.dx * pull + (pointer.x - 0.5) * 15
                : 0;
              const y = spread
                ? placement.dy * pull + (pointer.y - 0.5) * 11
                : 0;
              const rotation =
                placement.rotate + (spread ? (index % 2 ? 1.5 : -1.5) : 0);
              const style = {
                left: placement.left,
                top: placement.top,
                width: placement.width,
                height: placement.height,
                zIndex: index + 1,
                "--scatter-x": `${x}px`,
                "--scatter-y": `${y}px`,
                "--tilt": `${rotation}deg`,
                "--lift": spread ? `${6 + proximity * 10}px` : "0px",
                "--scale": spread ? `${1.015 + proximity * 0.025}` : "1",
              } as CSSProperties;
              return (
                <button
                  key={photo.src}
                  className={`photo-card photo-card--${index + 1}`}
                  style={style}
                  type="button"
                  onClick={() => setLightboxIndex(index)}
                  aria-label={`Open photograph: ${photo.title}`}
                >
                  <img
                    src={photo.src}
                    alt={photo.alt}
                    loading={index > 1 ? "lazy" : "eager"}
                    fetchPriority={index === 0 ? "high" : "auto"}
                  />
                  <span className="photo-card__caption">{photo.category}</span>
                </button>
              );
            })}
            <div
              className="photo-stack__focus"
              style={{
                left: `${pointer.x * 100}%`,
                top: `${pointer.y * 100}%`,
              }}
              aria-hidden="true"
            >
              <Focus size={28} strokeWidth={1} />
            </div>
            <span className="photo-stack__index" aria-hidden="true">
              JF · 01—{String(photos.length).padStart(2, "0")}
            </span>
          </div>
          <button
            className="photo-spread-toggle"
            type="button"
            onClick={() => setTouchSpread(value => !value)}
            aria-pressed={touchSpread}
          >
            {touchSpread ? "Gather the photographs" : "Spread the photographs"}{" "}
            <span aria-hidden="true">↗</span>
          </button>
        </div>
      </div>
      <a className="hero-scroll" href="#about">
        <span>Scroll to discover</span>
        <ArrowDown size={15} strokeWidth={1.5} />
      </a>
      {lightboxIndex !== null && (
        <Lightbox
          photos={photos}
          activeIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onChange={setLightboxIndex}
        />
      )}
    </section>
  );
}
