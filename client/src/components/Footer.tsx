import { ArrowUp, ArrowUpRight, MapPin } from "lucide-react";
import BrandMark from "./BrandMark";
import { studioConfig } from "@/data/siteConfig";

const quickLinks = [
  ["About", "about"],
  ["Gallery", "gallery"],
  ["Films", "films"],
  ["Services", "services"],
  ["Contact", "contact"],
];

export default function Footer() {
  const email = studioConfig.email
    ? `mailto:${studioConfig.email}`
    : "#contact";
  return (
    <footer className="site-footer">
      <div className="page-shell">
        <div className="site-footer__main">
          <div className="site-footer__brand">
            <a href="#home" aria-label="Jithu Films, back to top">
              <BrandMark />
            </a>
            <p>
              Every frame keeps a little piece
              <br />
              of the feeling that made it.
            </p>
          </div>
          <div className="site-footer__column">
            <span className="site-footer__heading">EXPLORE</span>
            {quickLinks.map(([name, id]) => (
              <a key={id} href={`#${id}`}>
                {name}
                <ArrowUpRight size={12} />
              </a>
            ))}
          </div>
          <div className="site-footer__column">
            <span className="site-footer__heading">SAY HELLO</span>
            <a href={email}>
              {studioConfig.emailIsPlaceholder
                ? "studio@example.com · sample"
                : studioConfig.email}
              <ArrowUpRight size={12} />
            </a>
            <a
              href={studioConfig.whatsappUrl || "#contact"}
              target={studioConfig.whatsappUrl ? "_blank" : undefined}
              rel={studioConfig.whatsappUrl ? "noreferrer" : undefined}
            >
              WhatsApp · +91 97402 77028
              <ArrowUpRight size={12} />
            </a>
            <a
              href={studioConfig.instagramUrl || "#contact"}
              target={studioConfig.instagramUrl ? "_blank" : undefined}
              rel={studioConfig.instagramUrl ? "noreferrer" : undefined}
            >
              Instagram · @jithufilms
              <ArrowUpRight size={12} />
            </a>
            {studioConfig.location && (
              <a href={studioConfig.location} target="_blank" rel="noreferrer">
                <MapPin size={12} /> Find us on Google Maps
                <ArrowUpRight size={12} />
              </a>
            )}
          </div>
          <div className="site-footer__closing">
            <div className="footer-aperture" aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
            </div>
            <p>
              For the days you'll return to,
              <br />
              long after the flowers fade.
            </p>
          </div>
        </div>
        <div className="site-footer__bottom">
          <span>© {new Date().getFullYear()} Jithu Films</span>
          <span>
            Made with{" "}
            <a
              className="site-footer__credit"
              href="https://cre8tivewebflix.com"
              target="_blank"
              rel="noreferrer"
            >
              Cre8tivewebflix
            </a>
          </span>
          <a href="#home" className="back-to-top">
            Back to top <ArrowUp size={14} />
          </a>
        </div>
      </div>
    </footer>
  );
}
