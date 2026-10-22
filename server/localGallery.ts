import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import {
  MAX_INTRO_PHOTOS,
  MIN_INTRO_PHOTOS,
  withDefaultIntroPhotos,
  type PhotoItem,
} from "../shared/galleryPhotos";
import { galleryPhotos as defaultPhotos } from "../shared/galleryPhotos";

export interface LocalGalleryPhoto extends PhotoItem {
  id: number;
}

let pendingOperation: Promise<unknown> = Promise.resolve();

function serialize<T>(operation: () => Promise<T>): Promise<T> {
  const result = pendingOperation.then(operation, operation);
  pendingOperation = result.then(
    () => undefined,
    () => undefined
  );
  return result;
}

function manifestPath() {
  return path.join(
    process.env.LOCAL_GALLERY_DIR ?? path.join(process.cwd(), ".webdev"),
    "gallery.json"
  );
}

function uploadsDirectory() {
  return (
    process.env.LOCAL_GALLERY_PUBLIC_DIR ??
    path.join(process.cwd(), "client", "public", "uploads")
  );
}

async function writePhotos(photos: LocalGalleryPhoto[]) {
  const target = manifestPath();
  const directory = path.dirname(target);
  await mkdir(directory, { recursive: true });
  const temporaryFile = path.join(directory, `gallery-${randomUUID()}.tmp`);
  await writeFile(temporaryFile, JSON.stringify(photos, null, 2), {
    encoding: "utf8",
    flag: "wx",
  });
  await rename(temporaryFile, target);
}

async function readPhotos() {
  try {
    const content = await readFile(manifestPath(), "utf8");
    const photos: unknown = JSON.parse(content);
    if (!Array.isArray(photos) || !photos.every(isLocalGalleryPhoto)) {
      throw new Error("Local gallery manifest has an invalid format.");
    }
    return withDefaultIntroPhotos(photos);
  } catch (error) {
    if (
      !(error instanceof Error) ||
      !("code" in error) ||
      error.code !== "ENOENT"
    ) {
      throw error;
    }
    const defaults = withDefaultIntroPhotos(
      defaultPhotos.map((photo, index) => ({
        ...photo,
        id: index + 1,
      }))
    );
    await writePhotos(defaults);
    return defaults;
  }
}

function isLocalGalleryPhoto(value: unknown): value is LocalGalleryPhoto {
  if (!value || typeof value !== "object") return false;
  const photo = value as Record<string, unknown>;
  return (
    Number.isSafeInteger(photo.id) &&
    (photo.id as number) > 0 &&
    typeof photo.src === "string" &&
    typeof photo.alt === "string" &&
    typeof photo.title === "string" &&
    typeof photo.caption === "string" &&
    typeof photo.category === "string" &&
    (photo.isIntro === undefined || typeof photo.isIntro === "boolean")
  );
}

export function listLocalGalleryPhotos() {
  return serialize(readPhotos);
}

export function setLocalIntroPhotos(ids: number[]) {
  return serialize(async () => {
    if (
      ids.length < MIN_INTRO_PHOTOS ||
      ids.length > MAX_INTRO_PHOTOS ||
      new Set(ids).size !== ids.length
    ) {
      throw new Error("Select between 6 and 8 different opening photos.");
    }
    const photos = await readPhotos();
    if (!ids.every(id => photos.some(photo => photo.id === id))) return false;
    await writePhotos(
      photos.map(photo => ({ ...photo, isIntro: ids.includes(photo.id) }))
    );
    return true;
  });
}

async function removeUploadedFile(src: string) {
  const filename = src.match(
    /^\/uploads\/([0-9a-f-]+\.(?:jpg|png|webp))$/
  )?.[1];
  if (!filename) return;
  try {
    await unlink(path.join(uploadsDirectory(), filename));
  } catch (error) {
    if (
      !(error instanceof Error) ||
      !("code" in error) ||
      error.code !== "ENOENT"
    ) {
      console.error("[Gallery] Could not remove an unused upload:", error);
    }
  }
}

export function addLocalGalleryPhoto(
  photo: Omit<PhotoItem, "src">,
  filename: string,
  data: Buffer
) {
  return serialize(async () => {
    const photos = await readPhotos();
    const id =
      photos.reduce((highest, item) => Math.max(highest, item.id), 0) + 1;
    const directory = uploadsDirectory();
    await mkdir(directory, { recursive: true });
    const filePath = path.join(directory, filename);
    await writeFile(filePath, data, { flag: "wx" });
    try {
      await writePhotos([
        ...photos,
        { ...photo, id, src: `/uploads/${filename}`, isIntro: false },
      ]);
    } catch (error) {
      await unlink(filePath);
      throw error;
    }
    return { ...photo, id, src: `/uploads/${filename}`, isIntro: false };
  });
}

export function updateLocalGalleryPhoto(
  id: number,
  photo: Omit<PhotoItem, "src">,
  image?: { filename: string; data: Buffer }
) {
  return serialize(async () => {
    const photos = await readPhotos();
    const existing = photos.find(item => item.id === id);
    if (!existing) return undefined;

    let src = existing.src;
    let filePath: string | undefined;
    if (image) {
      const directory = uploadsDirectory();
      await mkdir(directory, { recursive: true });
      filePath = path.join(directory, image.filename);
      await writeFile(filePath, image.data, { flag: "wx" });
      src = `/uploads/${image.filename}`;
    }

    const updated = { ...existing, ...photo, id, src };
    try {
      await writePhotos(
        withDefaultIntroPhotos(
          photos.map(item => (item.id === id ? updated : item))
        )
      );
    } catch (error) {
      if (filePath) await unlink(filePath);
      throw error;
    }

    if (image) await removeUploadedFile(existing.src);
    return updated;
  });
}

export function removeLocalGalleryPhoto(id: number) {
  return serialize(async () => {
    const photos = await readPhotos();
    const existing = photos.find(item => item.id === id);
    if (!existing) return "not-found" as const;
    if (photos.length <= 1) return "last-photo" as const;
    await writePhotos(
      withDefaultIntroPhotos(photos.filter(item => item.id !== id))
    );
    await removeUploadedFile(existing.src);
    return "removed" as const;
  });
}
