import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ArrowLeft, ArrowRight, Focus, Scan } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGalleryPhotos } from "@/hooks/useGalleryPhotos";
import Lightbox from "./Lightbox";

export default function GallerySection() {
  const galleryPhotos = useGalleryPhotos();
  const shutterPhotos = useMemo(
    () => galleryPhotos.slice(0, 5),
    [galleryPhotos]
  );
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const coverRef = useRef<HTMLDivElement>(null);
  const transitionRef = useRef<gsap.core.Timeline | null>(null);
  const preloadedImagesRef = useRef<HTMLImageElement[]>([]);
  const activeRef = useRef(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    preloadedImagesRef.current = shutterPhotos.map(photo => {
      const image = new Image();
      image.decoding = "async";
      image.src = photo.src;
      return image;
    });
  }, [shutterPhotos]);

  const showFrame = useCallback(
    (nextIndex: number, animate = true) => {
      const normalized =
        (nextIndex + shutterPhotos.length) % shutterPhotos.length;
      if (normalized === activeRef.current) return;
      activeRef.current = normalized;
      const cover = coverRef.current;
      if (
        !cover ||
        !animate ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ) {
        transitionRef.current?.kill();
        if (cover) gsap.set(cover, { scale: 0, opacity: 0 });
        setActiveIndex(normalized);
        return;
      }
      transitionRef.current?.kill();
      transitionRef.current = gsap
        .timeline()
        .set(cover, { scale: 0, opacity: 1 })
        .to(cover, { scale: 1.28, duration: 0.14, ease: "power2.in" })
        .call(() => setActiveIndex(normalized))
        .to(cover, { scale: 0, duration: 0.22, ease: "power3.out" });
    },
    [shutterPhotos.length]
  );

  useLayoutEffect(() => {
    if (
      !sectionRef.current ||
      !stageRef.current ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    gsap.registerPlugin(ScrollTrigger);
    const media = gsap.matchMedia();
    media.add("(min-width: 900px)", () => {
      const trigger = ScrollTrigger.create({
        trigger: stageRef.current,
        pin: stageRef.current,
        pinSpacing: true,
        start: "top top+=4",
        end: () => `+=${Math.round(window.innerHeight * 2.2)}`,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onUpdate: self => {
          const next = Math.min(
            shutterPhotos.length - 1,
            Math.floor(self.progress * shutterPhotos.length)
          );
          showFrame(next, false);
        },
        onLeave: () => setExpanded(true),
        onEnterBack: () => setExpanded(false),
        onLeaveBack: () => {
          setExpanded(false);
          showFrame(0, false);
        },
      });
      return () => trigger.kill();
    });
    return () => {
      media.revert();
      transitionRef.current?.kill();
    };
  }, [showFrame]);

  const activePhoto = shutterPhotos[activeIndex];

  return (
    <section
      className="gallery-section section-pad"
      id="gallery"
      ref={sectionRef}
      aria-labelledby="gallery-title"
    >
      <div className="page-shell">
        <div className="section-heading section-heading--split">
          <div>
            <p className="eyebrow">
              <span className="eyebrow__rule" /> Our stories
            </p>
            <h2 id="gallery-title">
              A moment,
              <br />
              <em>held forever.</em>
            </h2>
          </div>
          <p className="section-heading__aside">
            A collection of honest little moments, unfolding one frame at a
            time.
          </p>
        </div>

        <div
          className={`gallery-stage${expanded ? " gallery-stage--expanded" : ""}`}
          ref={stageRef}
        >
          <div
            className="gallery-viewfinder"
            aria-label={`Wedding photograph ${activeIndex + 1} of ${shutterPhotos.length}`}
          >
            <img
              key={activePhoto.src}
              className="gallery-viewfinder__photo"
              src={activePhoto.src}
              alt={activePhoto.alt}
              loading="eager"
              decoding="async"
            />
            <div className="gallery-viewfinder__wash" aria-hidden="true" />
            <div ref={coverRef} className="gallery-shutter" aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
            </div>
            <div className="viewfinder-corners" aria-hidden="true">
              <i />
              <i />
              <i />
              <i />
            </div>
            <div className="gallery-viewfinder__topline">
              <span className="gallery-rec">
                <i /> REC
              </span>
              <span>
                <Scan size={13} /> AUTO FOCUS
              </span>
            </div>
            <div className="gallery-viewfinder__bottomline">
              <span className="gallery-viewfinder__caption">
                <small>{activePhoto.category}</small>
                <strong>{activePhoto.title}</strong>
              </span>
              <span className="gallery-counter">
                {String(activeIndex + 1).padStart(2, "0")} <i>/</i>{" "}
                {String(shutterPhotos.length).padStart(2, "0")}
              </span>
            </div>
            <span className="gallery-viewfinder__focus" aria-hidden="true">
              <Focus size={32} strokeWidth={1} />
            </span>
          </div>
          <div className="gallery-stage__note">
            <span>SCROLL TO REVEAL</span>
            <span className="gallery-stage__line" />
          </div>
          <div
            className="gallery-stage__manual"
            aria-label="Choose a wedding frame"
          >
            <button
              className="icon-button"
              type="button"
              onClick={() => showFrame(activeIndex - 1)}
              aria-label="Previous wedding frame"
            >
              <ArrowLeft size={16} />
            </button>
            <button
              className="icon-button"
              type="button"
              onClick={() => showFrame(activeIndex + 1)}
              aria-label="Next wedding frame"
            >
              <ArrowRight size={16} />
            </button>
          </div>
        </div>

        <div
          className="gallery-grid"
          aria-label="Wedding photograph collection"
        >
          {galleryPhotos.map((photo, index) => (
            <button
              key={photo.src}
              className={`gallery-tile gallery-tile--${index + 1}`}
              type="button"
              onClick={() => setLightboxIndex(index)}
              aria-label={`Open ${photo.title} photograph`}
            >
              <img src={photo.src} alt={photo.alt} loading="lazy" />
              <span className="gallery-tile__caption">
                <small>{photo.category}</small>
                <strong>{photo.title}</strong>
              </span>
              <span className="gallery-tile__number">
                {String(index + 1).padStart(2, "0")}
              </span>
            </button>
          ))}
        </div>
        <div className="gallery-endnote">
          <span>JF — STORY COLLECTION</span>
          <a href="#films">
            See the stories in motion <ArrowRight size={15} />
          </a>
        </div>
      </div>
      {lightboxIndex !== null && (
        <Lightbox
          photos={galleryPhotos}
          activeIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onChange={setLightboxIndex}
        />
      )}
    </section>
  );
}
