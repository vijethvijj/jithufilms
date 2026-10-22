import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import { useGalleryPhotos } from "@/hooks/useGalleryPhotos";

interface LoadingIntroProps {
  onComplete: () => void;
}

const SESSION_KEY = "jithu-films-intro-seen";

function isPreviewMode() {
  if (typeof window === "undefined") return false;
  return (
    new URLSearchParams(window.location.search).get("previewIntro") === "1"
  );
}

function mayShowIntro() {
  if (typeof window === "undefined") return false;
  try {
    return (
      sessionStorage.getItem(SESSION_KEY) !== "1" &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  } catch {
    return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }
}

export default function LoadingIntro({ onComplete }: LoadingIntroProps) {
  const galleryPhotos = useGalleryPhotos();
  const introPhotos = galleryPhotos.filter(photo => photo.isIntro);
  const [previewMode] = useState(isPreviewMode);
  const [shouldShow] = useState(() => previewMode || mayShowIntro());
  const [leaving, setLeaving] = useState(false);
  const [frameIndex, setFrameIndex] = useState(0);
  const completed = useRef(false);
  const introPhoto =
    introPhotos.length > 0
      ? introPhotos[frameIndex % introPhotos.length]
      : galleryPhotos[0];

  const finish = useCallback(() => {
    if (completed.current) return;
    completed.current = true;
    if (!previewMode) {
      try {
        sessionStorage.setItem(SESSION_KEY, "1");
      } catch {
        // The intro remains skippable if browser storage is unavailable.
      }
    }
    setLeaving(true);
    window.setTimeout(onComplete, 620);
  }, [onComplete, previewMode]);

  useEffect(() => {
    if (!shouldShow) {
      onComplete();
      return;
    }
    const timer = window.setTimeout(finish, 2850);
    return () => window.clearTimeout(timer);
  }, [finish, onComplete, shouldShow]);

  useEffect(() => {
    if (!shouldShow || introPhotos.length < 2) return;
    const timer = window.setInterval(
      () => setFrameIndex(index => (index + 1) % introPhotos.length),
      420
    );
    return () => window.clearInterval(timer);
  }, [introPhotos.length, shouldShow]);

  if (!shouldShow || leaving) {
    if (leaving)
      return (
        <div
          className="loading-intro loading-intro--leaving"
          aria-hidden="true"
        >
          <div className="loading-intro__lens loading-intro__lens--exit">
            <img
              key={introPhoto.src}
              className="loading-intro__zoom-image"
              src={introPhoto.src}
              alt=""
              loading="eager"
              decoding="async"
            />
            <Aperture />
          </div>
        </div>
      );
    return null;
  }

  return (
    <div
      className="loading-intro"
      role="status"
      aria-label="Opening Jithu Films"
    >
      <div className="loading-intro__grain" aria-hidden="true" />
      <div className="loading-intro__content">
        <div className="loading-intro__lens" aria-hidden="true">
          <img
            key={introPhoto.src}
            className="loading-intro__zoom-image"
            src={introPhoto.src}
            alt=""
            loading="eager"
            decoding="async"
          />
          <Aperture />
          <span className="loading-intro__lens-glow" />
        </div>
        <div className="loading-intro__wordmark">
          <span className="loading-intro__letters" aria-hidden="true">
            {"JITHU FILMS".split("").map((letter, index) => (
              <span
                key={`${letter}-${index}`}
                style={{ animationDelay: `${index * 65}ms` }}
              >
                {letter === " " ? "\u00a0" : letter}
              </span>
            ))}
          </span>
          <span className="sr-only">Jithu Films</span>
        </div>
        <p className="loading-intro__tagline">Every Frame Tells a Story.</p>
        <div className="loading-intro__progress" aria-hidden="true">
          <span />
        </div>
      </div>
      <button className="loading-intro__skip" onClick={finish} type="button">
        Skip intro <ArrowRight size={14} strokeWidth={1.5} />
      </button>
    </div>
  );
}

function Aperture() {
  return (
    <svg
      className="loading-aperture"
      viewBox="0 0 180 180"
      aria-hidden="true"
      focusable="false"
    >
      <circle className="loading-aperture__outline" cx="90" cy="90" r="82" />
      <circle className="loading-aperture__inner" cx="90" cy="90" r="47" />
      <g className="loading-aperture__blades" transform="translate(90 90)">
        {Array.from({ length: 7 }, (_, index) => (
          <path
            key={index}
            d="M-9 -18 L15 -66 L51 -52 L25 -4 L-3 10 Z"
            transform={`rotate(${index * (360 / 7)})`}
          />
        ))}
      </g>
      <circle className="loading-aperture__core" cx="90" cy="90" r="12" />
    </svg>
  );
}
