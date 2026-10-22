import { useEffect, useRef } from "react";
import { Aperture, Heart, Sparkles } from "lucide-react";

const highlights = [
  { title: "Candid Moments", icon: Heart },
  { title: "Cinematic Storytelling", icon: Aperture },
  { title: "Timeless Memories", icon: Sparkles },
];

export default function AboutSection() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const node = sectionRef.current;
    if (!node || !("IntersectionObserver" in window)) {
      node?.classList.add("is-revealed");
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        node.classList.add("is-revealed");
        observer.disconnect();
      }
    }, { threshold: 0.16 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="about-section section-pad" id="about" ref={sectionRef} aria-labelledby="about-title">
      <div className="about-section__inner page-shell">
        <div className="about-section__image-wrap reveal-image">
          <img src="/images/About.jpeg" alt="Jithu Films wedding photography" loading="lazy" />
          <div className="about-section__image-tag"><span className="record-dot" /> Behind the frame <span>— JF / 08</span></div>
          <span className="about-section__image-stamp" aria-hidden="true">MADE OF<br />MOMENTS</span>
        </div>
        <div className="about-section__copy reveal-copy">
          <p className="eyebrow"><span className="eyebrow__rule" /> A little about us</p>
          <h2 id="about-title">Behind Every<br /><em>Beautiful Frame.</em></h2>
          <p className="about-section__body">With three years of experience in photography, our friendly team specializes in capturing life’s happiest, most unforgettable moments. We pay attention to every detail and work hard to deliver photographs and films our clients love. Thank you for trusting us to frame your memories beautifully. DM us for enquiries and bookings.</p>
          <div className="about-section__highlights">
            {highlights.map(({ title, icon: Icon }, index) => (
              <div className="about-highlight" key={title}>
                <span className="about-highlight__number">0{index + 1}</span>
                <span className="about-highlight__icon"><Icon size={17} strokeWidth={1.5} /></span>
                <span>{title}</span>
              </div>
            ))}
          </div>
          <a className="text-link" href="#contact">Tell us what matters to you <span aria-hidden="true">↗</span></a>
        </div>
      </div>
    </section>
  );
}
