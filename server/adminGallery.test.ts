import { once } from "node:events";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import express from "express";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { registerAdminGalleryRoutes } from "./adminGallery";

const environmentNames = [
  "ADMIN_USERNAME",
  "ADMIN_PASSWORD",
  "ADMIN_SESSION_SECRET",
  "DATABASE_URL",
  "LOCAL_GALLERY_DIR",
  "LOCAL_GALLERY_PUBLIC_DIR",
  "NODE_ENV",
] as const;
const previousEnvironment = Object.fromEntries(
  environmentNames.map(name => [name, process.env[name]])
);
const jpegData = Buffer.from([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
]);
const pngData = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

describe("admin gallery", () => {
  let server: ReturnType<express.Express["listen"]>;
  let baseUrl: string;
  let temporaryDirectory: string;
  let sessionCookie: string;

  beforeAll(async () => {
    temporaryDirectory = await mkdtemp(
      path.join(os.tmpdir(), "jf-admin-gallery-test-")
    );
    process.env.NODE_ENV = "development";
    delete process.env.DATABASE_URL;
    process.env.LOCAL_GALLERY_DIR = path.join(temporaryDirectory, "state");
    process.env.LOCAL_GALLERY_PUBLIC_DIR = path.join(
      temporaryDirectory,
      "uploads"
    );
    process.env.ADMIN_USERNAME = "studio-admin";
    process.env.ADMIN_PASSWORD = "studio-password-long-enough";
    process.env.ADMIN_SESSION_SECRET =
      "test-session-secret-with-more-than-32-characters";

    const app = express();
    app.use(express.json());
    registerAdminGalleryRoutes(app);
    server = app.listen(0, "127.0.0.1");
    await once(server, "listening");
    const address = server.address();
    if (!address || typeof address === "string")
      throw new Error("Test server did not bind to a TCP port");
    baseUrl = `http://127.0.0.1:${address.port}`;

    const unauthorized = await fetch(`${baseUrl}/api/admin/photos`);
    expect(unauthorized.status).toBe(401);

    const login = await fetch(`${baseUrl}/api/admin/login`, {
      method: "POST",
      headers: {
        Origin: baseUrl,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: "studio-admin",
        password: "studio-password-long-enough",
      }),
    });
    expect(login.status).toBe(200);
    sessionCookie =
      login.headers.get("set-cookie")?.match(/^jf_admin_session=[^;]+/)?.[0] ??
      "";
    expect(sessionCookie).not.toBe("");
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

  it("adds photos, edits their details and image, and deletes them", async () => {
    const metadata = {
      title: "Test photo",
      alt: "An uploaded test photograph",
      caption: "A test caption.",
      category: "Wedding",
    };
    const upload = await fetch(`${baseUrl}/api/admin/photos`, {
      method: "POST",
      headers: {
        Origin: baseUrl,
        Cookie: sessionCookie,
        "Content-Type": "application/octet-stream",
        "X-Photo-Title": encodeURIComponent(metadata.title),
        "X-Photo-Alt": encodeURIComponent(metadata.alt),
        "X-Photo-Caption": encodeURIComponent(metadata.caption),
        "X-Photo-Category": encodeURIComponent(metadata.category),
      },
      body: jpegData,
    });
    expect(upload.status).toBe(201);
    const created = (await upload.json()) as {
      id: number;
      src: string;
      title: string;
    };
    expect(created.title).toBe(metadata.title);
    expect(created.src).toMatch(/^\/uploads\/[0-9a-f-]+\.jpg$/);
    const createdFile = path.join(
      temporaryDirectory,
      "uploads",
      path.basename(created.src)
    );
    expect((await stat(createdFile)).isFile()).toBe(true);

    const updated = await fetch(`${baseUrl}/api/admin/photos/${created.id}`, {
      method: "PATCH",
      headers: {
        Origin: baseUrl,
        Cookie: sessionCookie,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ...metadata, title: "Edited photo" }),
    });
    expect(updated.status).toBe(200);
    expect((await updated.json()).title).toBe("Edited photo");

    const replaced = await fetch(`${baseUrl}/api/admin/photos/${created.id}`, {
      method: "PATCH",
      headers: {
        Origin: baseUrl,
        Cookie: sessionCookie,
        "Content-Type": "application/octet-stream",
        "X-Photo-Title": "Edited photo",
        "X-Photo-Alt": encodeURIComponent(metadata.alt),
        "X-Photo-Caption": encodeURIComponent(metadata.caption),
        "X-Photo-Category": encodeURIComponent(metadata.category),
      },
      body: pngData,
    });
    expect(replaced.status).toBe(200);
    const replacedPhoto = (await replaced.json()) as { src: string };
    expect(replacedPhoto.src).toMatch(/^\/uploads\/[0-9a-f-]+\.png$/);
    await expect(readFile(createdFile)).rejects.toMatchObject({
      code: "ENOENT",
    });

    const deletion = await fetch(`${baseUrl}/api/admin/photos/${created.id}`, {
      method: "DELETE",
      headers: { Origin: baseUrl, Cookie: sessionCookie },
    });
    expect(deletion.status).toBe(200);
    const gallery = JSON.parse(
      await readFile(
        path.join(temporaryDirectory, "state", "gallery.json"),
        "utf8"
      )
    ) as Array<{ id: number }>;
    expect(gallery.some(photo => photo.id === created.id)).toBe(false);
  });

  it("rejects sign-in without a same-origin request", async () => {
    const response = await fetch(`${baseUrl}/api/admin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "studio-admin",
        password: "studio-password-long-enough",
      }),
    });
    expect(response.status).toBe(403);
  });

  it("clears the admin login when the admin page is reopened", async () => {
    const logout = await fetch(`${baseUrl}/api/admin/logout`, {
      method: "POST",
      headers: {
        Origin: baseUrl,
        Cookie: sessionCookie,
      },
    });
    expect(logout.status).toBe(200);
    expect(logout.headers.get("set-cookie")).toContain(
      "Expires=Thu, 01 Jan 1970 00:00:00 GMT"
    );
    expect(await logout.json()).toEqual({ authenticated: false });

    const photos = await fetch(`${baseUrl}/api/admin/photos`);
    expect(photos.status).toBe(401);
  });

  it("lets an admin save 6 to 8 photos for the homepage collage and opening animation", async () => {
    const photosResponse = await fetch(`${baseUrl}/api/admin/photos`, {
      headers: { Cookie: sessionCookie },
    });
    expect(photosResponse.status).toBe(200);
    const photos = (await photosResponse.json()) as Array<{
      id: number;
      isIntro: boolean;
    }>;
    const selectedIds = photos.slice(1, 7).map(photo => photo.id);

    const response = await fetch(`${baseUrl}/api/admin/intro-photos`, {
      method: "PUT",
      headers: {
        Origin: baseUrl,
        Cookie: sessionCookie,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ids: selectedIds }),
    });
    expect(response.status).toBe(200);

    const updatedPhotos = (await (
      await fetch(`${baseUrl}/api/admin/photos`, {
        headers: { Cookie: sessionCookie },
      })
    ).json()) as Array<{ id: number; isIntro: boolean }>;
    expect(
      updatedPhotos.filter(photo => photo.isIntro).map(photo => photo.id)
    ).toEqual(selectedIds);

    const manifest = JSON.parse(
      await readFile(
        path.join(temporaryDirectory, "state", "gallery.json"),
        "utf8"
      )
    ) as Array<{ id: number; isIntro: boolean }>;
    expect(
      manifest.filter(photo => photo.isIntro).map(photo => photo.id)
    ).toEqual(selectedIds);

    const allPhotoIds = photos.map(photo => photo.id);
    const maxSelection = await fetch(`${baseUrl}/api/admin/intro-photos`, {
      method: "PUT",
      headers: {
        Origin: baseUrl,
        Cookie: sessionCookie,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ids: allPhotoIds }),
    });
    expect(maxSelection.status).toBe(200);
    const maxSelectedPhotos = (await (
      await fetch(`${baseUrl}/api/admin/photos`, {
        headers: { Cookie: sessionCookie },
      })
    ).json()) as Array<{ id: number; isIntro: boolean }>;
    expect(maxSelectedPhotos.filter(photo => photo.isIntro)).toHaveLength(8);
  });

  it("rejects opening animation selections outside the allowed photo count", async () => {
    const response = await fetch(`${baseUrl}/api/admin/intro-photos`, {
      method: "PUT",
      headers: {
        Origin: baseUrl,
        Cookie: sessionCookie,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ids: [1, 2, 3, 4, 5] }),
    });
    expect(response.status).toBe(400);
  });

  it("rejects opening animation selections with missing gallery photos", async () => {
    const response = await fetch(`${baseUrl}/api/admin/intro-photos`, {
      method: "PUT",
      headers: {
        Origin: baseUrl,
        Cookie: sessionCookie,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ids: [1, 2, 3, 4, 5, 99999] }),
    });
    expect(response.status).toBe(404);
  });
});
