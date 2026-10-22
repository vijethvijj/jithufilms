import {
  int,
  boolean,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

/** Core user table backing the optional starter auth flow. */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/** Public booking enquiries. This table is append-only from the public route. */
export const bookingEnquiries = mysqlTable("booking_enquiries", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  email: varchar("email", { length: 254 }).notNull(),
  phone: varchar("phone", { length: 32 }).notNull(),
  eventType: varchar("eventType", { length: 40 }).notNull(),
  eventDate: varchar("eventDate", { length: 10 }).notNull(),
  eventLocation: varchar("eventLocation", { length: 180 }).notNull(),
  services: text("services").notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type InsertBookingEnquiry = typeof bookingEnquiries.$inferInsert;

export const galleryPhotos = mysqlTable("gallery_photos", {
  id: int("id").autoincrement().primaryKey(),
  src: varchar("src", { length: 500 }).notNull().unique(),
  alt: varchar("alt", { length: 255 }).notNull(),
  title: varchar("title", { length: 150 }).notNull(),
  caption: varchar("caption", { length: 500 }).notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  isIntro: boolean("isIntro").default(false).notNull(),
  storageKey: varchar("storageKey", { length: 500 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type GalleryPhoto = typeof galleryPhotos.$inferSelect;
export type InsertGalleryPhoto = typeof galleryPhotos.$inferInsert;
