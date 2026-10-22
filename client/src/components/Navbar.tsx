import { useEffect, useState } from "react";
import { ArrowUpRight, Menu, X } from "lucide-react";
import BrandMark from "./BrandMark";

const links = [
  ["Home", "home"],
  ["About", "about"],
  ["Gallery", "gallery"],
  ["Films", "films"],
  ["Services", "services"],
  ["Contact", "contact"],
] as const;

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [active, setActive] = useState("home");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    const sections = links.map(([, id]) => document.getElementById(id)).filter((node): node is HTMLElement => Boolean(node));
    const observer = new IntersectionObserver(
      entries => entries.forEach(entry => { if (entry.isIntersecting) setActive(entry.target.id); }),
      { rootMargin: "-32% 0px -58% 0px", threshold: 0 },
    );
    sections.forEach(section => observer.observe(section));
    return () => {
      window.removeEventListener("scroll", onScroll);
      observer.disconnect();
    };
  }, []);

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className={`site-nav${isScrolled ? " site-nav--scrolled" : ""}${menuOpen ? " site-nav--open" : ""}`}>
      <div className="site-nav__inner">
        <a className="site-nav__brand" href="#home" onClick={closeMenu} aria-label="Jithu Films home">
          <BrandMark />
        </a>
        <nav className="site-nav__links" aria-label="Main navigation">
          {links.map(([label, id]) => (
            <a key={id} href={`#${id}`} className={active === id ? "is-active" : ""} aria-current={active === id ? "location" : undefined} onClick={closeMenu}>
              {label}
            </a>
          ))}
        </nav>
        <a className="site-nav__book" href="#contact" onClick={closeMenu}>Book Your Date <ArrowUpRight size={14} strokeWidth={1.5} /></a>
        <button className="site-nav__toggle" type="button" aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"} aria-expanded={menuOpen} aria-controls="mobile-navigation" onClick={() => setMenuOpen(open => !open)}>
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>
      <nav id="mobile-navigation" className={`site-nav__mobile${menuOpen ? " site-nav__mobile--visible" : ""}`} aria-label="Mobile navigation" aria-hidden={!menuOpen}>
        {links.map(([label, id], index) => (
          <a key={id} tabIndex={menuOpen ? 0 : -1} href={`#${id}`} onClick={closeMenu} style={{ transitionDelay: menuOpen ? `${index * 35}ms` : "0ms" }}>{label}</a>
        ))}
        <a tabIndex={menuOpen ? 0 : -1} className="site-nav__mobile-cta" href="#contact" onClick={closeMenu}>Book Your Date <ArrowUpRight size={16} /></a>
      </nav>
    </header>
  );
}
