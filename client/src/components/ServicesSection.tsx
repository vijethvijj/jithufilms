import { useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import { services } from "@/data/siteConfig";
import { useGalleryPhotos } from "@/hooks/useGalleryPhotos";

interface ServicesSectionProps {
  onEnquire: (service: string) => void;
}

export default function ServicesSection({ onEnquire }: ServicesSectionProps) {
  const photos = useGalleryPhotos();
  const gridRef = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    if (!("IntersectionObserver" in window)) {
      setRevealed(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setRevealed(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12 }
    );
    observer.observe(grid);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      className="services-section section-pad"
      id="services"
      aria-labelledby="services-title"
    >
      <div className="page-shell">
        <div className="section-heading section-heading--split">
          <div>
            <p className="eyebrow">
              <span className="eyebrow__rule" /> Made for your story
            </p>
            <h2 id="services-title">
              A way to
              <br />
              <em>remember.</em>
            </h2>
          </div>
          <p className="section-heading__aside">
            From the first conversation to the last page of your album, we'll
            meet your day with care.
          </p>
        </div>
        <div
          className={`services-grid${revealed ? " services-grid--visible" : ""}`}
          ref={gridRef}
        >
          {services.map((service, index) => {
            const image =
              photos.find(photo => photo.src === service.image.src) ??
              photos[index % photos.length] ??
              service.image;
            return (
              <article
                className="service-card"
                key={`${service.number}-${service.title}`}
              >
                <div className="service-card__image">
                  <img src={image.src} alt={image.alt} loading="lazy" />
                  <span>{service.number}</span>
                </div>
                <div className="service-card__content">
                  <h3>{service.title}</h3>
                  <p>{service.description}</p>
                  <button
                    className="service-card__link"
                    type="button"
                    onClick={() => onEnquire(service.title)}
                  >
                    Enquire Now <ArrowRight size={15} />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
