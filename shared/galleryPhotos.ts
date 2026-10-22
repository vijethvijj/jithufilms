export interface PhotoItem {
  src: string;
  alt: string;
  title: string;
  caption: string;
  category: string;
  shape?: "portrait" | "landscape" | "square";
  isIntro?: boolean;
}

export const MIN_INTRO_PHOTOS = 6;
export const MAX_INTRO_PHOTOS = 8;
export const DEFAULT_INTRO_PHOTOS = 7;

export function withDefaultIntroPhotos<T extends PhotoItem>(
  photos: T[]
): (Omit<T, "isIntro"> & { isIntro: boolean })[] {
  const selectedCount = photos.filter(photo => photo.isIntro).length;
  const hasValidSelection =
    selectedCount >= MIN_INTRO_PHOTOS && selectedCount <= MAX_INTRO_PHOTOS;
  const defaultCount = Math.min(DEFAULT_INTRO_PHOTOS, photos.length);
  return photos.map((photo, index) => ({
    ...photo,
    isIntro: hasValidSelection ? Boolean(photo.isIntro) : index < defaultCount,
  }));
}

const optimizedPhotoSources: Record<string, string> = {
  "/images/Cinimetic.jpeg": "/images/gallery/Cinimetic.webp",
  "/images/Ceremony.jpeg": "/images/gallery/Ceremony.webp",
};

export function optimizeGalleryPhoto<T extends PhotoItem>(photo: T): T {
  const src = optimizedPhotoSources[photo.src];
  return src ? { ...photo, src } : photo;
}

export const galleryPhotos: PhotoItem[] = [
  {
    src: "/images/gallery/Cinimetic.webp",
    alt: "A couple portrait from a wedding celebration",
    title: "A moment together",
    caption: "A portrait preserving a moment from the celebration.",
    category: "Couple portrait",
    shape: "landscape",
  },
  {
    src: "/images/Portrait.jpeg",
    alt: "A portrait from the wedding collection",
    title: "A quiet portrait",
    caption: "A portrait captured during the celebration.",
    category: "Portrait",
    shape: "portrait",
  },

  {
    src: "/images/Candid.jpeg",
    alt: "A candid moment from a wedding",
    title: "In the moment",
    caption: "An unposed moment from the day.",
    category: "Candid",
    shape: "portrait",
  },
  {
    src: "/images/gallery/Ceremony.webp",
    alt: "A wedding ceremony",
    title: "The ceremony",
    caption: "A meaningful moment from the wedding ceremony.",
    category: "Ceremony",
    shape: "portrait",
  },
  {
    src: "/images/Engagement.jpeg",
    alt: "An engagement portrait",
    title: "The engagement",
    caption: "A portrait from the couple's engagement story.",
    category: "Engagement",
    shape: "landscape",
  },
  {
    src: "/images/Pre%20wedding.jpeg",
    alt: "A pre-wedding photograph",
    title: "Before the wedding",
    caption: "A moment from the couple's pre-wedding session.",
    category: "Pre-wedding",
    shape: "landscape",
  },
  {
    src: "/images/Couple%20portrait.jpeg",
    alt: "A couple portrait",
    title: "Together",
    caption: "A portrait of the couple, held in a single frame.",
    category: "Couple portrait",
    shape: "landscape",
  },
  {
    src: "/images/Pre%20wedding%201.jpeg",
    alt: "A second photograph from a pre-wedding session",
    title: "A story in the making",
    caption: "Another frame from the pre-wedding session.",
    category: "Pre-wedding",
    shape: "landscape",
  },
];
