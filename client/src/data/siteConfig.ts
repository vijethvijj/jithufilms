import { truncateSync } from "node:fs";
import { galleryPhotos, type PhotoItem } from "@shared/galleryPhotos";

export { galleryPhotos };
export type { PhotoItem };

export interface FilmItem {
  title: string;
  category: string;
  duration?: string;
  poster: string;
  videoSrc: string;
}

export const studioConfig = {
  name: "Jithu Films",
  email: "jitheshpoojary678@gmail.com",
  emailIsPlaceholder: false,
  whatsappUrl: "https://wa.me/919740277028",
  instagramUrl: "https://www.instagram.com/jithufilms/",
  location: "https://maps.app.goo.gl/QR8aUgiWYbMvnYDa9?g_st=aw",
  locationIsPlaceholder: false,
};

export const films: FilmItem[] = [
  {
    title: "Wedding Stories",
    category: "Wedding film",
    poster: galleryPhotos[0].src,
    videoSrc: "/images/Video%201.mp4",
  },
  {
    title: "Haldi Ceremony",
    category: "Haldi ceremony",
    poster: galleryPhotos[2].src,
    videoSrc: "/images/Video%202.mp4",
  },
  {
    title: "Wedding Stories",
    category: "Wedding film", 
    poster: galleryPhotos[3].src,
    videoSrc: "/images/Video%203.mp4",
  },
  {
    title: "Haldi Ceremony",
    category: "Haldi ceremony",
    poster: galleryPhotos[1].src,
    videoSrc: "/images/Haldhi.mp4",
  },
];

export const services = [
  {
    number: "01",
    title: "Wedding Photography",
    description: "Candid photographs of the people, rituals and details that make your day yours.",
    image: galleryPhotos[3],
  },
  {
    number: "02",
    title: "Cinematic Wedding Films",
    description: "A thoughtful film built around the voices, movement and feeling of the celebration.",
    image: galleryPhotos[0],
  },
  {
    number: "03",
    title: "Pre-Wedding Photography",
    description: "An easygoing session that gives you room to be yourselves in front of the camera.",
    image: galleryPhotos[5],
  },
  {
    number: "04",
    title: "Engagement Photography",
    description: "A relaxed portrait session celebrating your engagement and the story you are beginning together.",
    image: galleryPhotos[4],
  },
];
