import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import {
  raw,
  type Express,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import { parse as parseCookieHeader } from "cookie";
import { SignJWT, jwtVerify } from "jose";
import { optimizeGalleryPhoto, type PhotoItem } from "../shared/galleryPhotos";
import {
  addGalleryPhoto,
  listGalleryPhotos,
  removeGalleryPhoto,
  setIntroGalleryPhotos,
  updateGalleryPhoto,
} from "./db";
import {
  addLocalGalleryPhoto,
  listLocalGalleryPhotos,
  removeLocalGalleryPhoto,
  setLocalIntroPhotos,
  updateLocalGalleryPhoto,
} from "./localGallery";
import { storagePut } from "./storage";
import { MAX_INTRO_PHOTOS, MIN_INTRO_PHOTOS } from "../shared/galleryPhotos";

const SESSION_COOKIE = "jf_admin_session";
const SESSION_DURATION_SECONDS = 8 * 60 * 60;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const MAX_LOGIN_ATTEMPTS = 5;
const loginAttempts = new Map<string, { startedAt: number; count: number }>();
const photoFields = ["title", "alt", "caption", "category"] as const;
type PhotoField = (typeof photoFields)[number];
type PhotoMetadata = Pick<PhotoItem, PhotoField>;

function isLocalGalleryMode() {
  return process.env.NODE_ENV === "development" && !process.env.DATABASE_URL;
}

function sessionKey() {
  const secret = process.env.ADMIN_SESSION_SECRET;
  return secret && Buffer.byteLength(secret, "utf8") >= 32
    ? new TextEncoder().encode(secret)
    : null;
}

function isAdminConfigured() {
  return Boolean(
    process.env.ADMIN_USERNAME &&
      process.env.ADMIN_USERNAME.length <= 128 &&
      process.env.ADMIN_PASSWORD &&
      process.env.ADMIN_PASSWORD.length >= 12 &&
      process.env.ADMIN_PASSWORD.length <= 1024 &&
      sessionKey()
  );
}

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/api/admin",
    maxAge: SESSION_DURATION_SECONDS * 1000,
  };
}

function hasSameOrigin(req: Request) {
  const origin = req.get("origin");
  const host = req.get("host");
  if (!origin || !host) return false;
  try {
    return new URL(origin).host.toLowerCase() === host.toLowerCase();
  } catch {
    return false;
  }
}

function constantTimeEqual(left: string, right: string) {
  const leftHash = createHash("sha256").update(left).digest();
  const rightHash = createHash("sha256").update(right).digest();
  return timingSafeEqual(leftHash, rightHash);
}

function isRateLimited(req: Request) {
  const now = Date.now();
  for (const [ip, attempt] of loginAttempts) {
    if (now - attempt.startedAt > LOGIN_WINDOW_MS) loginAttempts.delete(ip);
  }
  if (loginAttempts.size > 10_000) loginAttempts.clear();
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  const current = loginAttempts.get(ip);
  if (!current || now - current.startedAt > LOGIN_WINDOW_MS) {
    loginAttempts.set(ip, { startedAt: now, count: 1 });
    return false;
  }
  if (current.count >= MAX_LOGIN_ATTEMPTS) return true;
  current.count += 1;
  return false;
}

function clearLoginAttempts(req: Request) {
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  loginAttempts.delete(ip);
}

async function isAuthenticated(req: Request) {
  const key = sessionKey();
  if (!key) return false;
  try {
    const token = parseCookieHeader(req.headers.cookie ?? "")[SESSION_COOKIE];
    if (!token) return false;
    const { payload } = await jwtVerify(token, key, {
      algorithms: ["HS256"],
      issuer: "jithu-films-admin",
    });
    return payload.sub === "admin";
  } catch {
    return false;
  }
}

async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!isAdminConfigured()) {
    res.status(503).json({
      message: "Admin sign-in is not configured on the server.",
    });
    return;
  }
  if (!(await isAuthenticated(req))) {
    res
      .status(401)
      .json({ message: "Please sign in to manage gallery photos." });
    return;
  }
  next();
}

function decodeHeader(value: string | undefined) {
  if (!value) return "";
  try {
    return decodeURIComponent(value).trim();
  } catch {
    return "";
  }
}

function photoMetadata(value: unknown): PhotoMetadata | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const fields = value as Record<string, unknown>;
  const limits: Record<PhotoField, number> = {
    title: 150,
    alt: 255,
    caption: 500,
    category: 100,
  };
  const metadata = {} as PhotoMetadata;
  for (const field of photoFields) {
    const entry = fields[field];
    if (
      typeof entry !== "string" ||
      !entry.trim() ||
      entry.length > limits[field]
    )
      return null;
    metadata[field] = entry.trim();
  }
  return metadata;
}

function headerMetadata(req: Request) {
  return photoMetadata({
    title: decodeHeader(req.get("x-photo-title")),
    alt: decodeHeader(req.get("x-photo-alt")),
    caption: decodeHeader(req.get("x-photo-caption")),
    category: decodeHeader(req.get("x-photo-category")),
  });
}

function parsePhotoId(value: string) {
  if (!/^[1-9]\d*$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) ? id : null;
}

function isPositivePhotoId(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function imageType(data: Buffer) {
  if (
    data.length >= 3 &&
    data[0] === 0xff &&
    data[1] === 0xd8 &&
    data[2] === 0xff
  )
    return { extension: "jpg", contentType: "image/jpeg" };
  if (
    data.length >= 8 &&
    data
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return { extension: "png", contentType: "image/png" };
  }
  if (
    data.length >= 12 &&
    data.toString("ascii", 0, 4) === "RIFF" &&
    data.toString("ascii", 8, 12) === "WEBP"
  ) {
    return { extension: "webp", contentType: "image/webp" };
  }
  return null;
}

function parseImageBody(req: Request, res: Response, next: NextFunction) {
  raw({ type: "application/octet-stream", limit: MAX_IMAGE_BYTES })(
    req,
    res,
    error => {
      if (error) {
        const status =
          (error as { status?: number }).status === 413 ? 413 : 400;
        res.status(status).json({
          message: "Image must be a JPEG, PNG, or WebP file under 10 MB.",
        });
        return;
      }
      next();
    }
  );
}

function requestPhoto(req: Request) {
  return Buffer.isBuffer(req.body)
    ? headerMetadata(req)
    : photoMetadata(req.body);
}

function sendPersistenceError(res: Response, action: string, error: unknown) {
  console.error(`[Admin gallery] Could not ${action}:`, error);
  res.status(503).json({
    message: `Could not ${action}. Check the database and server storage configuration, then try again.`,
  });
}

function requestImage(req: Request, res: Response) {
  if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
    res
      .status(400)
      .json({ message: "Choose an image file smaller than 10 MB." });
    return null;
  }
  const type = imageType(req.body);
  if (!type) {
    res.status(400).json({
      message: "Only JPEG, PNG, and WebP image files can be uploaded.",
    });
    return null;
  }
  return { data: req.body, type };
}

export function registerAdminGalleryRoutes(app: Express) {
  const photoList = async (_req: Request, res: Response) => {
    try {
      const photos = isLocalGalleryMode()
        ? await listLocalGalleryPhotos()
        : await listGalleryPhotos();
      res
        .set("Cache-Control", "no-store")
        .json(photos.map(optimizeGalleryPhoto));
    } catch (error) {
      sendPersistenceError(res, "load gallery photos", error);
    }
  };

  app.get("/api/admin/session", async (req, res) => {
    res.set("Cache-Control", "no-store").json({
      authenticated: isAdminConfigured() && (await isAuthenticated(req)),
      configured: isAdminConfigured(),
    });
  });

  app.post("/api/admin/login", async (req, res) => {
    if (!hasSameOrigin(req)) {
      res.status(403).json({ message: "Sign-in request was rejected." });
      return;
    }
    if (!isAdminConfigured()) {
      res.status(503).json({
        message:
          "Set ADMIN_USERNAME, ADMIN_PASSWORD (at least 12 characters), and ADMIN_SESSION_SECRET (at least 32 characters) on the server.",
      });
      return;
    }
    if (isRateLimited(req)) {
      res.status(429).json({
        message:
          "Too many sign-in attempts. Please wait 15 minutes and try again.",
      });
      return;
    }

    const { username, password } = req.body ?? {};
    if (
      typeof username !== "string" ||
      typeof password !== "string" ||
      username.length > 128 ||
      password.length > 1024 ||
      !constantTimeEqual(username, process.env.ADMIN_USERNAME!) ||
      !constantTimeEqual(password, process.env.ADMIN_PASSWORD!)
    ) {
      res
        .status(401)
        .json({ message: "The username or password is incorrect." });
      return;
    }

    clearLoginAttempts(req);
    const key = sessionKey();
    if (!key) {
      res
        .status(503)
        .json({ message: "Admin session signing is not configured." });
      return;
    }
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: "HS256" })
      .setIssuer("jithu-films-admin")
      .setSubject("admin")
      .setIssuedAt()
      .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
      .sign(key);
    res
      .cookie(SESSION_COOKIE, token, cookieOptions())
      .json({ authenticated: true });
  });

  app.post("/api/admin/logout", (req, res) => {
    if (!hasSameOrigin(req)) {
      res.status(403).json({ message: "Sign-out request was rejected." });
      return;
    }
    res
      .clearCookie(SESSION_COOKIE, { ...cookieOptions(), maxAge: undefined })
      .json({ authenticated: false });
  });

  app.get("/api/admin/photos", requireAdmin, photoList);

  app.put("/api/admin/intro-photos", requireAdmin, async (req, res) => {
    if (!hasSameOrigin(req)) {
      res.status(403).json({ message: "Intro photo update was rejected." });
      return;
    }
    const requestedIds: unknown = req.body?.ids;
    const ids =
      Array.isArray(requestedIds) && requestedIds.every(isPositivePhotoId)
        ? requestedIds
        : null;
    if (
      ids === null ||
      ids.length < MIN_INTRO_PHOTOS ||
      ids.length > MAX_INTRO_PHOTOS ||
      new Set(ids).size !== ids.length
    ) {
      res
        .status(400)
        .json({ message: "Select 6 to 8 different opening photos." });
      return;
    }
    try {
      const updated = isLocalGalleryMode()
        ? await setLocalIntroPhotos(ids)
        : await setIntroGalleryPhotos(ids);
      if (!updated) {
        res.status(404).json({
          message: "One or more photos are no longer in the gallery.",
        });
        return;
      }
      res.json({ ids });
    } catch (error) {
      sendPersistenceError(res, "update the opening animation photo", error);
    }
  });

  app.post(
    "/api/admin/photos",
    requireAdmin,
    parseImageBody,
    async (req, res) => {
      if (!hasSameOrigin(req)) {
        res.status(403).json({ message: "Photo upload was rejected." });
        return;
      }
      const metadata = headerMetadata(req);
      if (!metadata) {
        res.status(400).json({
          message: "Enter valid title, alt text, caption, and category.",
        });
        return;
      }
      const upload = requestImage(req, res);
      if (!upload) return;

      try {
        if (isLocalGalleryMode()) {
          const photo = await addLocalGalleryPhoto(
            metadata,
            `${randomUUID()}.${upload.type.extension}`,
            upload.data
          );
          res.status(201).json(optimizeGalleryPhoto(photo));
          return;
        }
        const storage = await storagePut(
          `gallery/${randomUUID()}.${upload.type.extension}`,
          upload.data,
          upload.type.contentType
        );
        const photo = await addGalleryPhoto({
          ...metadata,
          src: storage.url,
          storageKey: storage.key,
        });
        res.status(201).json(optimizeGalleryPhoto(photo));
      } catch (error) {
        sendPersistenceError(res, "save the photo", error);
      }
    }
  );

  app.patch(
    "/api/admin/photos/:id",
    requireAdmin,
    (req, res, next) => {
      if (req.is("application/octet-stream")) {
        parseImageBody(req, res, next);
        return;
      }
      next();
    },
    async (req, res) => {
      if (!hasSameOrigin(req)) {
        res.status(403).json({ message: "Photo update was rejected." });
        return;
      }
      const id = parsePhotoId(req.params.id);
      if (id === null) {
        res.status(400).json({ message: "The selected photo ID is invalid." });
        return;
      }
      const metadata = requestPhoto(req);
      if (!metadata) {
        res.status(400).json({
          message: "Enter valid title, alt text, caption, and category.",
        });
        return;
      }
      const upload = Buffer.isBuffer(req.body) ? requestImage(req, res) : null;
      if (Buffer.isBuffer(req.body) && !upload) return;

      try {
        let updated;
        if (isLocalGalleryMode()) {
          updated = await updateLocalGalleryPhoto(
            id,
            metadata,
            upload
              ? {
                  filename: `${randomUUID()}.${upload.type.extension}`,
                  data: upload.data,
                }
              : undefined
          );
        } else {
          let storedImage: { key: string; url: string } | undefined;
          if (upload) {
            storedImage = await storagePut(
              `gallery/${randomUUID()}.${upload.type.extension}`,
              upload.data,
              upload.type.contentType
            );
          }
          updated = await updateGalleryPhoto(id, {
            ...metadata,
            ...(storedImage
              ? { src: storedImage.url, storageKey: storedImage.key }
              : {}),
          });
        }
        if (!updated) {
          res
            .status(404)
            .json({ message: "That photo is no longer in the gallery." });
          return;
        }
        res.json(optimizeGalleryPhoto(updated));
      } catch (error) {
        sendPersistenceError(res, "update the photo", error);
      }
    }
  );

  app.delete("/api/admin/photos/:id", requireAdmin, async (req, res) => {
    if (!hasSameOrigin(req)) {
      res.status(403).json({ message: "Photo deletion was rejected." });
      return;
    }
    const id = parsePhotoId(req.params.id);
    if (id === null) {
      res.status(400).json({ message: "The selected photo ID is invalid." });
      return;
    }
    try {
      const result = isLocalGalleryMode()
        ? await removeLocalGalleryPhoto(id)
        : await removeGalleryPhoto(id);
      if (result === "not-found") {
        res
          .status(404)
          .json({ message: "That photo is no longer in the gallery." });
        return;
      }
      if (result === "last-photo") {
        res
          .status(409)
          .json({ message: "Keep at least one photo in the gallery." });
        return;
      }
      res.json({ removed: true });
    } catch (error) {
      sendPersistenceError(res, "remove the photo", error);
    }
  });
}
