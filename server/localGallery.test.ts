import { once } from "node:events";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import express from "express";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { galleryPhotos } from "../shared/galleryPhotos";
import { registerGalleryRoute } from "./gallery";

const environmentNames = [
  "DATABASE_URL",
  "LOCAL_GALLERY_DIR",
  "NODE_ENV",
] as const;
const previousEnvironment = Object.fromEntries(
  environmentNames.map(name => [name, process.env[name]])
);

describe("public local development gallery", () => {
  let server: ReturnType<express.Express["listen"]>;
  let baseUrl: string;
  let temporaryDirectory: string;

  beforeAll(async () => {
    temporaryDirectory = await mkdtemp(
      path.join(os.tmpdir(), "jf-gallery-test-")
    );
    process.env.NODE_ENV = "development";
    delete process.env.DATABASE_URL;
    process.env.LOCAL_GALLERY_DIR = path.join(temporaryDirectory, "state");

    const app = express();
    registerGalleryRoute(app);
    server = app.listen(0, "127.0.0.1");
    await once(server, "listening");
    const address = server.address();
    if (!address || typeof address === "string")
      throw new Error("Test server did not bind to a TCP port");
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) =>
      server.close(error => (error ? reject(error) : resolve()))
    );
    await rm(temporaryDirectory, { recursive: true, force: true });
    for (const name of environmentNames) {
      const value = previousEnvironment[name];
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  });

  it("serves optimized photos from an existing gallery and exposes no admin routes", async () => {
    const stateDirectory = path.join(temporaryDirectory, "state");
    await mkdir(stateDirectory, { recursive: true });
    await writeFile(
      path.join(stateDirectory, "gallery.json"),
      JSON.stringify(
        galleryPhotos.map((photo, index) => ({
          ...photo,
          id: index + 1,
          src:
            index === 0
              ? "/images/Cinimetic.jpeg"
              : index === 3
                ? "/images/Ceremony.jpeg"
                : photo.src,
        }))
      )
    );

    const initial = await fetch(`${baseUrl}/api/gallery`);
    expect(initial.status).toBe(200);
    const photos = (await initial.json()) as Array<{
      src: string;
      isIntro: boolean;
    }>;
    expect(photos).toHaveLength(8);
    expect(photos[0].src).toBe("/images/gallery/Cinimetic.webp");
    expect(photos[3].src).toBe("/images/gallery/Ceremony.webp");
    expect(photos.filter(photo => photo.isIntro)).toHaveLength(7);
    expect(photos[0].isIntro).toBe(true);

    const savedManifest = JSON.parse(
      await readFile(
        path.join(temporaryDirectory, "state", "gallery.json"),
        "utf8"
      )
    ) as Array<{ id: number }>;
    expect(savedManifest).toHaveLength(8);
    expect((await fetch(`${baseUrl}/api/admin/session`)).status).toBe(404);
    expect((await fetch(`${baseUrl}/api/admin/photos`)).status).toBe(404);
  });
});
