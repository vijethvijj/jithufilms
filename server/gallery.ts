import type { Express, Response } from "express";
import {
  optimizeGalleryPhoto,
  withDefaultIntroPhotos,
} from "../shared/galleryPhotos";
import { listGalleryPhotos } from "./db";
import { listLocalGalleryPhotos } from "./localGallery";

function isLocalGalleryMode() {
  return process.env.NODE_ENV === "development" && !process.env.DATABASE_URL;
}

function sendPersistenceError(res: Response, error: unknown) {
  console.error("[Gallery] Could not load gallery photos:", error);
  res.status(503).json({
    message:
      "Could not load gallery photos. Check the database and server storage configuration, then try again.",
  });
}

export function registerGalleryRoute(app: Express) {
  app.get("/api/gallery", async (_req, res) => {
    try {
      const photos = isLocalGalleryMode()
        ? await listLocalGalleryPhotos()
        : await listGalleryPhotos();
      res
        .set("Cache-Control", "no-store")
        .json(withDefaultIntroPhotos(photos).map(optimizeGalleryPhoto));
    } catch (error) {
      sendPersistenceError(res, error);
    }
  });
}
