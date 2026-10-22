import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  galleryPhotos,
  withDefaultIntroPhotos,
  type PhotoItem,
} from "@shared/galleryPhotos";

export const galleryQueryKey = ["galleryPhotos"] as const;
const galleryUpdateStorageKey = "jithu-films-gallery-updated";

export function announceGalleryUpdate() {
  try {
    window.localStorage.setItem(galleryUpdateStorageKey, String(Date.now()));
  } catch (error) {
    console.warn("[Gallery] Could not notify other open tabs:", error);
  }
}

async function fetchGalleryPhotos(): Promise<PhotoItem[]> {
  const response = await fetch("/api/gallery");
  const result = (await response.json()) as PhotoItem[] | { message?: string };
  if (!response.ok) {
    throw new Error(
      !Array.isArray(result) && result.message
        ? result.message
        : "Could not load gallery photos."
    );
  }
  if (!Array.isArray(result))
    throw new Error("The gallery response was invalid.");
  return withDefaultIntroPhotos(result);
}

export function useGalleryPhotos() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: galleryQueryKey,
    queryFn: fetchGalleryPhotos,
    initialData: withDefaultIntroPhotos(galleryPhotos),
    initialDataUpdatedAt: 0,
    retry: false,
    staleTime: 30_000,
  });
  useEffect(() => {
    const refreshGallery = (event: StorageEvent) => {
      if (event.key === galleryUpdateStorageKey) {
        void queryClient.invalidateQueries({ queryKey: galleryQueryKey });
      }
    };
    window.addEventListener("storage", refreshGallery);
    return () => window.removeEventListener("storage", refreshGallery);
  }, [queryClient]);
  return query.data ?? withDefaultIntroPhotos(galleryPhotos);
}
