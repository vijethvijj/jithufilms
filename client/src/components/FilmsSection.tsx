import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowUpRight, Play, X } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { films, galleryPhotos, type FilmItem } from "@/data/siteConfig";
import { useGalleryPhotos } from "@/hooks/useGalleryPhotos";

export default function FilmsSection() {
  const photos = useGalleryPhotos();
  const sectionRef = useRef<HTMLElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const [activeFilm, setActiveFilm] = useState<FilmItem | null>(null);
  const [videoError, setVideoError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useLayoutEffect(() => {
    if (!sectionRef.current || !stripRef.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    gsap.registerPlugin(ScrollTrigger);
    const context = gsap.context(() => {
      gsap.to(stripRef.current, {
        xPercent: -24,
        ease: "none",
        scrollTrigger: { trigger: sectionRef.current, start: "top bottom", end: "bottom top", scrub: 0.65 },
      });
    }, sectionRef);
    return () => context.revert();
  }, []);

  useEffect(() => {
    if (!activeFilm) return;
    setVideoError(false);
    if (videoRef.current) {
      videoRef.current.muted = false;
      videoRef.current.volume = 1;
    }
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    videoRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setActiveFilm(null); };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", closeOnEscape);
      videoRef.current?.pause();
    };
  }, [activeFilm]);

  return (
    <section className="films-section section-pad" id="films" ref={sectionRef} aria-labelledby="films-title">
      <div className="page-shell">
        <div className="section-heading section-heading--split">
          <div><p className="eyebrow"><span className="eyebrow__rule" /> The moving picture</p><h2 id="films-title">Stories in<br /><em>Motion.</em></h2></div>
          <div className="section-heading__aside"><p>Sound, movement and all the little things that can only be felt when a story moves.</p><span className="demo-footnote">WEDDING FILMS · JITHU FILMS</span></div>
        </div>

        <div className="film-card-grid">
          {films.map((film, index) => {
            const displayFilm = { ...film, poster: photos.find(photo => photo.src === film.poster)?.src ?? photos[index % photos.length]?.src ?? galleryPhotos[0].src };
            return (
            <button className={`film-card film-card--${index + 1}`} key={`${film.title}-${index}`} type="button" onClick={() => setActiveFilm(displayFilm)} aria-label={`Play ${film.title}`}>
              <span className="film-card__media"><img src={displayFilm.poster} alt="" loading="lazy" /><span className="film-card__shade" /><span className="film-card__play"><Play fill="currentColor" size={18} /></span>{film.duration && <span className="film-card__duration">{film.duration}</span>}<span className="film-card__demo">JITHU FILMS</span></span>
              <span className="film-card__details"><span><small>{film.category}</small><strong>{film.title}</strong></span><ArrowUpRight size={17} strokeWidth={1.5} /></span>
            </button>
            );
          })}
        </div>

        <div className="film-strip" aria-label="A strip of wedding frames">
          <div className="film-strip__track" ref={stripRef}>
            {[...photos.slice(0, 6), ...photos.slice(0, 6)].map((photo, index) => (
              <div className="film-strip__frame" key={`${photo.src}-${index}`}><img src={photo.src} alt="" loading="lazy" /><span>{String(index % 6 + 1).padStart(2, "0")}</span></div>
            ))}
          </div>
          <span className="film-strip__label">A ROLL OF THE DAY · JITHU FILMS</span>
        </div>
      </div>

      {activeFilm && (
        <div className="film-modal" role="dialog" aria-modal="true" aria-label={`${activeFilm.title} video preview`} onMouseDown={event => { if (event.target === event.currentTarget) setActiveFilm(null); }}>
          <button className="film-modal__close icon-button" type="button" onClick={() => setActiveFilm(null)} aria-label="Close film"><X size={23} /></button>
          <div className="film-modal__body">
            <div className="film-modal__player-wrap">
              {!videoError ? (
                <video ref={videoRef} src={activeFilm.videoSrc} poster={activeFilm.poster} controls autoPlay playsInline preload="metadata" aria-label={activeFilm.title} onLoadedMetadata={event => { event.currentTarget.muted = false; event.currentTarget.volume = 1; }} onError={() => setVideoError(true)} />
              ) : (
                <div className="film-modal__error"><Play size={30} /><p>This film could not be loaded. Please try again later.</p></div>
              )}
            </div>
            <div className="film-modal__caption"><span className="eyebrow"><span className="eyebrow__rule" /> Jithu Films</span><h3>{activeFilm.title}</h3></div>
          </div>
        </div>
      )}
    </section>
  );
}
