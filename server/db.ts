import { asc, eq, inArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertBookingEnquiry,
  InsertGalleryPhoto,
  InsertUser,
  bookingEnquiries,
  galleryPhotos as galleryPhotoTable,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";
import {
  DEFAULT_INTRO_PHOTOS,
  MAX_INTRO_PHOTOS,
  MIN_INTRO_PHOTOS,
  withDefaultIntroPhotos,
  galleryPhotos as defaultGalleryPhotos,
} from "../shared/galleryPhotos";

let _db: ReturnType<typeof drizzle> | null = null;
let gallerySeedPromise: Promise<void> | null = null;

/** Lazily create the database connection so local tooling can run without a DB. */
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");

  const db = await getDb();
  if (!db) throw new Error("Database is not available");

  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0)
      updateSet.lastSignedIn = new Date();

    await db
      .insert(users)
      .values(values)
      .onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }
  const result = await db
    .select()
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function insertBookingEnquiry(
  enquiry: Omit<InsertBookingEnquiry, "id" | "createdAt">
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.insert(bookingEnquiries).values(enquiry);
}

async function ensureGalleryPhotosSeeded() {
  if (!gallerySeedPromise) {
    gallerySeedPromise = (async () => {
      const db = await getDb();
      if (!db) throw new Error("Database is not available");
      const existing = await db
        .select({ id: galleryPhotoTable.id })
        .from(galleryPhotoTable)
        .limit(1);
      if (existing.length > 0) return;

      const defaults: InsertGalleryPhoto[] = defaultGalleryPhotos.map(
        (photo, index) => ({
          src: photo.src,
          alt: photo.alt,
          title: photo.title,
          caption: photo.caption,
          category: photo.category,
          isIntro: index < DEFAULT_INTRO_PHOTOS,
          storageKey: null,
        })
      );
      await db
        .insert(galleryPhotoTable)
        .values(defaults)
        .onDuplicateKeyUpdate({ set: { src: sql`VALUES(src)` } });
    })().catch(error => {
      gallerySeedPromise = null;
      throw error;
    });
  }
  await gallerySeedPromise;
}

export async function listGalleryPhotos() {
  await ensureGalleryPhotosSeeded();
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db
    .select({
      id: galleryPhotoTable.id,
      src: galleryPhotoTable.src,
      alt: galleryPhotoTable.alt,
      title: galleryPhotoTable.title,
      caption: galleryPhotoTable.caption,
      category: galleryPhotoTable.category,
      isIntro: galleryPhotoTable.isIntro,
    })
    .from(galleryPhotoTable)
    .orderBy(asc(galleryPhotoTable.id))
    .then(withDefaultIntroPhotos);
}

const galleryPhotoFields = {
  id: galleryPhotoTable.id,
  src: galleryPhotoTable.src,
  alt: galleryPhotoTable.alt,
  title: galleryPhotoTable.title,
  caption: galleryPhotoTable.caption,
  category: galleryPhotoTable.category,
  isIntro: galleryPhotoTable.isIntro,
};

export async function setIntroGalleryPhotos(ids: number[]) {
  if (
    ids.length < MIN_INTRO_PHOTOS ||
    ids.length > MAX_INTRO_PHOTOS ||
    new Set(ids).size !== ids.length
  ) {
    throw new Error("Select between 6 and 8 different opening photos.");
  }
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db.transaction(async tx => {
    const photos = await tx
      .select({ id: galleryPhotoTable.id })
      .from(galleryPhotoTable)
      .for("update")
      .then(rows => new Set(rows.map(photo => photo.id)));
    if (!ids.every(id => photos.has(id))) return false;
    await tx.update(galleryPhotoTable).set({ isIntro: false });
    await tx
      .update(galleryPhotoTable)
      .set({ isIntro: true })
      .where(inArray(galleryPhotoTable.id, ids));
    return true;
  });
}

export async function addGalleryPhoto(photo: InsertGalleryPhoto) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.insert(galleryPhotoTable).values(photo);
  const [created] = await db
    .select(galleryPhotoFields)
    .from(galleryPhotoTable)
    .where(eq(galleryPhotoTable.src, photo.src))
    .limit(1);
  if (!created)
    throw new Error("Gallery photo was saved but could not be read back");
  return created;
}

export async function updateGalleryPhoto(
  id: number,
  photo: Pick<InsertGalleryPhoto, "alt" | "title" | "caption" | "category"> &
    Partial<Pick<InsertGalleryPhoto, "src" | "storageKey">>
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db
    .update(galleryPhotoTable)
    .set(photo)
    .where(eq(galleryPhotoTable.id, id));
  const [updated] = await db
    .select(galleryPhotoFields)
    .from(galleryPhotoTable)
    .where(eq(galleryPhotoTable.id, id))
    .limit(1);
  return updated;
}

export async function removeGalleryPhoto(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db.transaction(async tx => {
    const photos = await tx
      .select({ id: galleryPhotoTable.id, isIntro: galleryPhotoTable.isIntro })
      .from(galleryPhotoTable)
      .orderBy(asc(galleryPhotoTable.id))
      .for("update");
    if (!photos.some(photo => photo.id === id)) return "not-found" as const;
    if (photos.length <= 1) return "last-photo" as const;
    const removed = photos.find(photo => photo.id === id);
    await tx.delete(galleryPhotoTable).where(eq(galleryPhotoTable.id, id));
    const remaining = photos.filter(photo => photo.id !== id);
    const selectedRemaining = remaining.filter(photo => photo.isIntro);
    if (
      removed?.isIntro &&
      selectedRemaining.length < MIN_INTRO_PHOTOS &&
      remaining.length >= MIN_INTRO_PHOTOS
    ) {
      const selected = remaining
        .slice(0, DEFAULT_INTRO_PHOTOS)
        .map(photo => photo.id);
      await tx.update(galleryPhotoTable).set({ isIntro: false });
      await tx
        .update(galleryPhotoTable)
        .set({ isIntro: true })
        .where(inArray(galleryPhotoTable.id, selected));
    }
    return "removed" as const;
  });
}
