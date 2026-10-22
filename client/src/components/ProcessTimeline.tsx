import { useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";

const steps = [
  { number: "01", title: "Connect", text: "We begin by understanding your vision, the people you love and the moments you want to remember." },
  { number: "02", title: "Plan", text: "Together, we prepare a thoughtful photography and filming schedule around your day." },
  { number: "03", title: "Capture", text: "We document authentic moments and emotions while giving your celebration room to unfold." },
  { number: "04", title: "Relive", text: "Your photographs and cinematic films become a way back to everything you felt." },
];

export default function ProcessTimeline() {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (!("IntersectionObserver" in window)) { setVisible(true); return; }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); observer.disconnect(); }
    }, { threshold: 0.15 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <section className={`process-section section-pad${visible ? " is-visible" : ""}`} id="process" ref={ref} aria-labelledby="process-title">
      <div className="page-shell">
        <div className="section-heading section-heading--split">
          <div><p className="eyebrow"><span className="eyebrow__rule" /> How we work</p><h2 id="process-title">Good things<br /><em>take a little care.</em></h2></div>
          <a className="text-link" href="#contact">Let's start with a conversation <span aria-hidden="true">↗</span></a>
        </div>
        <div className="process-timeline">
          <span className="process-timeline__line" aria-hidden="true"><i /></span>
          {steps.map((step, index) => (
            <article className="process-step" key={step.number} style={{ transitionDelay: `${index * 120}ms` }}>
              <span className="process-step__dot" aria-hidden="true"><i /></span>
              <span className="process-step__number">{step.number}</span>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
              {index < steps.length - 1 && <ArrowRight className="process-step__arrow" size={16} strokeWidth={1.4} aria-hidden="true" />}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
