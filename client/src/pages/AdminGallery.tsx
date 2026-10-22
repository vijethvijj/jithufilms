import { useEffect, useRef, useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Aperture,
  ArrowLeft,
  ImagePlus,
  LogOut,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import type { PhotoItem } from "@shared/galleryPhotos";
import {
  announceGalleryUpdate,
  galleryQueryKey,
} from "@/hooks/useGalleryPhotos";
import { photoCollagePlacements } from "@/data/photoCollage";
import { MAX_INTRO_PHOTOS, MIN_INTRO_PHOTOS } from "@shared/galleryPhotos";

interface AdminPhoto extends PhotoItem {
  id: number;
}

interface PhotoMetadata {
  title: string;
  alt: string;
  caption: string;
  category: string;
}

const emptyMetadata: PhotoMetadata = {
  title: "",
  alt: "",
  caption: "",
  category: "Wedding",
};

async function responseBody(response: Response): Promise<unknown> {
  if (!response.headers.get("content-type")?.includes("application/json")) {
    throw new Error(
      "The admin API is unavailable. Stop the static-only server and start the app with `pnpm dev`."
    );
  }
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      body &&
      typeof body === "object" &&
      "message" in body &&
      typeof body.message === "string"
        ? body.message
        : "The request could not be completed.";
    throw new Error(message);
  }
  return body;
}

function isPhoto(value: unknown): value is AdminPhoto {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    Number.isSafeInteger(item.id) &&
    typeof item.src === "string" &&
    typeof item.alt === "string" &&
    typeof item.title === "string" &&
    typeof item.caption === "string" &&
    typeof item.category === "string" &&
    typeof item.isIntro === "boolean"
  );
}

function encodeMetadata(metadata: PhotoMetadata) {
  return {
    "X-Photo-Title": encodeURIComponent(metadata.title.trim()),
    "X-Photo-Alt": encodeURIComponent(metadata.alt.trim()),
    "X-Photo-Caption": encodeURIComponent(metadata.caption.trim()),
    "X-Photo-Category": encodeURIComponent(metadata.category.trim()),
  };
}

async function optimizeImage(file: File): Promise<Blob> {
  const image = await createImageBitmap(file);
  try {
    const scale = Math.min(1, 2000 / Math.max(image.width, image.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(image.width * scale);
    canvas.height = Math.round(image.height * scale);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not prepare the selected image.");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        value =>
          value
            ? resolve(value)
            : reject(new Error("Could not compress the selected image.")),
        "image/webp",
        0.86
      );
    });
    return blob;
  } finally {
    image.close();
  }
}

export default function AdminGallery() {
  const queryClient = useQueryClient();
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [configured, setConfigured] = useState(true);
  const [photos, setPhotos] = useState<AdminPhoto[]>([]);
  const [introPhotoIds, setIntroPhotoIds] = useState<number[]>([]);
  const [metadata, setMetadata] = useState<PhotoMetadata>(emptyMetadata);
  const [file, setFile] = useState<File | null>(null);
  const [editingPhoto, setEditingPhoto] = useState<AdminPhoto | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/admin/logout", {
      method: "POST",
      credentials: "same-origin",
    })
      .then(async response => {
        await responseBody(response);
        return responseBody(
          await fetch("/api/admin/session", { credentials: "same-origin" })
        );
      })
      .then(body => {
        if (
          !body ||
          typeof body !== "object" ||
          !("authenticated" in body) ||
          typeof body.authenticated !== "boolean" ||
          !("configured" in body) ||
          typeof body.configured !== "boolean"
        ) {
          throw new Error("The server returned an invalid admin session.");
        }
        if (!active) return;
        setAuthenticated(body.authenticated);
        setConfigured(body.configured);
      })
      .catch(cause => {
        if (!active) return;
        setAuthenticated(false);
        setError(
          cause instanceof Error
            ? cause.message
            : "Could not check the admin session."
        );
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!authenticated) return;
    let active = true;
    fetch("/api/admin/photos", { credentials: "same-origin" })
      .then(responseBody)
      .then(body => {
        if (!Array.isArray(body) || !body.every(isPhoto)) {
          throw new Error("The server returned an invalid gallery.");
        }
        if (!active) return;
        setPhotos(body);
        setIntroPhotoIds(
          body.filter(photo => photo.isIntro).map(photo => photo.id)
        );
        queryClient.setQueryData(galleryQueryKey, body);
      })
      .catch(cause => {
        if (active) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Could not load gallery photos."
          );
          if (cause instanceof Error && cause.message.includes("sign in")) {
            setAuthenticated(false);
          }
        }
      });
    return () => {
      active = false;
    };
  }, [authenticated, queryClient]);

  const resetForm = () => {
    setMetadata(emptyMetadata);
    setFile(null);
    setEditingPhoto(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const login = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await responseBody(
        await fetch("/api/admin/login", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        })
      );
      setPassword("");
      setAuthenticated(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not sign in.");
    } finally {
      setBusy(false);
    }
  };

  const savePhoto = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      if (!editingPhoto && !file) {
        throw new Error("Choose an image to add to the gallery.");
      }
      if (file && file.size > 10 * 1024 * 1024) {
        throw new Error("Choose an image smaller than 10 MB.");
      }

      const method = editingPhoto ? "PATCH" : "POST";
      let body: BodyInit;
      let headers: Record<string, string>;
      if (file) {
        body = await optimizeImage(file);
        headers = {
          "Content-Type": "application/octet-stream",
          ...encodeMetadata(metadata),
        };
      } else {
        body = JSON.stringify(metadata);
        headers = { "Content-Type": "application/json" };
      }

      const response = await fetch(
        editingPhoto
          ? `/api/admin/photos/${editingPhoto.id}`
          : "/api/admin/photos",
        {
          method,
          credentials: "same-origin",
          headers,
          body,
        }
      );
      const result: unknown = await responseBody(response);
      if (!isPhoto(result))
        throw new Error("The server returned an invalid photo.");

      const updatedPhotos = editingPhoto
        ? photos.map(photo => (photo.id === result.id ? result : photo))
        : [...photos, result];
      setPhotos(updatedPhotos);
      setIntroPhotoIds(
        updatedPhotos.filter(photo => photo.isIntro).map(photo => photo.id)
      );
      queryClient.setQueryData(galleryQueryKey, updatedPhotos);
      announceGalleryUpdate();
      setNotice(
        editingPhoto ? "Photo details updated." : "Photo added to the gallery."
      );
      resetForm();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not save the photo."
      );
    } finally {
      setBusy(false);
    }
  };

  const editPhoto = (photo: AdminPhoto) => {
    setEditingPhoto(photo);
    setMetadata({
      title: photo.title,
      alt: photo.alt,
      caption: photo.caption,
      category: photo.category,
    });
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setError("");
    setNotice("");
    document.getElementById("admin-photo-form")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const saveIntroPhoto = async () => {
    if (
      introPhotoIds.length < MIN_INTRO_PHOTOS ||
      introPhotoIds.length > MAX_INTRO_PHOTOS
    )
      return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await responseBody(
        await fetch("/api/admin/intro-photos", {
          method: "PUT",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: introPhotoIds }),
        })
      );
      const updatedPhotos = photos.map(item => ({
        ...item,
        isIntro: introPhotoIds.includes(item.id),
      }));
      setPhotos(updatedPhotos);
      queryClient.setQueryData(galleryQueryKey, updatedPhotos);
      announceGalleryUpdate();
      setNotice(
        `${introPhotoIds.length} photos saved for the opening animation and homepage collage.`
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not update the opening animation photos."
      );
    } finally {
      setBusy(false);
    }
  };

  const toggleIntroPhoto = (id: number) => {
    setIntroPhotoIds(current =>
      current.includes(id)
        ? current.filter(photoId => photoId !== id)
        : current.length < 8
          ? [...current, id]
          : current
    );
    setError("");
    setNotice("");
  };

  const addPhoto = () => {
    document.getElementById("admin-photo-form")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
    document
      .querySelector<HTMLInputElement>("#admin-photo-form input[type='file']")
      ?.focus({ preventScroll: true });
  };

  const deletePhoto = async (photo: AdminPhoto) => {
    if (!window.confirm(`Remove “${photo.title}” from the gallery?`)) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await responseBody(
        await fetch(`/api/admin/photos/${photo.id}`, {
          method: "DELETE",
          credentials: "same-origin",
        })
      );
      const updatedPhotos: unknown = await responseBody(
        await fetch("/api/admin/photos", { credentials: "same-origin" })
      );
      if (!Array.isArray(updatedPhotos) || !updatedPhotos.every(isPhoto)) {
        throw new Error("The server returned an invalid gallery.");
      }
      setPhotos(updatedPhotos);
      setIntroPhotoIds(
        updatedPhotos.filter(item => item.isIntro).map(item => item.id)
      );
      queryClient.setQueryData(galleryQueryKey, updatedPhotos);
      announceGalleryUpdate();
      if (editingPhoto?.id === photo.id) resetForm();
      setNotice("Photo removed from the gallery.");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not remove the photo."
      );
    } finally {
      setBusy(false);
    }
  };

  const logout = async () => {
    setBusy(true);
    setError("");
    try {
      await responseBody(
        await fetch("/api/admin/logout", {
          method: "POST",
          credentials: "same-origin",
        })
      );
      setAuthenticated(false);
      setPhotos([]);
      queryClient.setQueryData(galleryQueryKey, undefined);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not sign out.");
    } finally {
      setBusy(false);
    }
  };

  if (authenticated === null) {
    return (
      <main className="admin-page">
        <p className="admin-status">Checking sign-in…</p>
      </main>
    );
  }

  if (!authenticated) {
    return (
      <main className="admin-page">
        <section className="admin-panel admin-login">
          <a className="admin-back" href="/">
            <ArrowLeft size={16} /> Back to Jithu Films
          </a>
          <p className="eyebrow">
            <span className="eyebrow__rule" /> Jithu Films
          </p>
          <h1>
            Gallery
            <br />
            <em>sign in.</em>
          </h1>
          <p className="admin-intro">
            Sign in to manage your gallery photographs and opening animation.
          </p>
          {!configured && (
            <p className="admin-message admin-message--error" role="status">
              Admin sign-in is not configured. Set ADMIN_USERNAME,
              ADMIN_PASSWORD (at least 12 characters), and ADMIN_SESSION_SECRET
              (at least 32 characters) in the server environment.
            </p>
          )}
          <form className="admin-form" onSubmit={login}>
            <label className="admin-field">
              <span>Username</span>
              <input
                autoComplete="username"
                required
                value={username}
                onChange={event => setUsername(event.target.value)}
              />
            </label>
            <label className="admin-field">
              <span>Password</span>
              <input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={event => setPassword(event.target.value)}
              />
            </label>
            <button
              className="button button--dark"
              type="submit"
              disabled={busy || !configured}
            >
              {busy ? "Signing in…" : "Sign in"}
            </button>
          </form>
          {error && (
            <p className="admin-message admin-message--error" role="alert">
              {error}
            </p>
          )}
        </section>
      </main>
    );
  }

  return (
    <main className="admin-page">
      <div className="admin-content">
        <header className="admin-header">
          <div>
            <a className="admin-back" href="/">
              <ArrowLeft size={16} /> View public website
            </a>
            <p className="eyebrow">
              <span className="eyebrow__rule" /> Jithu Films
            </p>
            <h1>
              Gallery
              <br />
              <em>manager.</em>
            </h1>
          </div>
          <button
            className="admin-logout"
            type="button"
            onClick={logout}
            disabled={busy}
          >
            <LogOut size={16} /> Sign out
          </button>
        </header>

        {error && (
          <p className="admin-message admin-message--error" role="alert">
            {error}
          </p>
        )}
        {notice && (
          <p className="admin-message admin-message--success" role="status">
            {notice}
          </p>
        )}

        <section
          className="admin-panel admin-editor admin-intro-photo"
          aria-labelledby="admin-intro-photo-title"
        >
          <div className="admin-editor__heading">
            <Aperture size={21} />
            <div>
              <h2 id="admin-intro-photo-title">Opening page animation</h2>
              <p>
                Choose {MIN_INTRO_PHOTOS}–{MAX_INTRO_PHOTOS} photos for the
                homepage collage and opening animation.
              </p>
            </div>
          </div>
          {photos.length < MIN_INTRO_PHOTOS ? (
            <div className="admin-intro-photo__empty">
              <p>
                Add at least 6 gallery photos before configuring the collage.
              </p>
              <button
                className="button button--dark"
                type="button"
                onClick={addPhoto}
              >
                <ImagePlus size={16} /> Add a gallery photo
              </button>
            </div>
          ) : (
            <>
              <div
                className="admin-intro-photo__options"
                role="group"
                aria-label="Choose photos for the homepage collage and opening animation"
              >
                {photos.map(photo => (
                  <button
                    className={`admin-intro-photo__option${introPhotoIds.includes(photo.id) ? " admin-intro-photo__option--selected" : ""}`}
                    key={photo.id}
                    type="button"
                    aria-pressed={introPhotoIds.includes(photo.id)}
                    onClick={() => toggleIntroPhoto(photo.id)}
                    disabled={
                      busy ||
                      (!introPhotoIds.includes(photo.id) &&
                        introPhotoIds.length >= MAX_INTRO_PHOTOS)
                    }
                  >
                    <img src={photo.src} alt="" loading="lazy" />
                    <span>{photo.title}</span>
                    {introPhotoIds.includes(photo.id) && (
                      <small>Selected</small>
                    )}
                  </button>
                ))}
              </div>
              <p className="admin-intro-photo__count">
                {introPhotoIds.length} of {MIN_INTRO_PHOTOS}–{MAX_INTRO_PHOTOS}{" "}
                photos selected
              </p>
              <div className="admin-intro-photo__preview-wrap">
                <h3>Homepage collage preview</h3>
                {introPhotoIds.length ? (
                  <div className="admin-intro-photo__preview">
                    {photos
                      .filter(photo => introPhotoIds.includes(photo.id))
                      .map((photo, index) => {
                        const placement = photoCollagePlacements[index];
                        return (
                          <img
                            key={photo.id}
                            src={photo.src}
                            alt={photo.alt}
                            style={{
                              left: placement.left,
                              top: placement.top,
                              width: placement.width,
                              height: placement.height,
                              transform: `rotate(${placement.rotate}deg)`,
                              zIndex: index + 1,
                            }}
                          />
                        );
                      })}
                  </div>
                ) : (
                  <p className="admin-intro-photo__empty-note">
                    Select 6–8 photos to preview the collage.
                  </p>
                )}
              </div>
              <div className="admin-form__actions">
                <button
                  className="button button--dark"
                  type="button"
                  onClick={() => void saveIntroPhoto()}
                  disabled={
                    busy ||
                    introPhotoIds.length < MIN_INTRO_PHOTOS ||
                    introPhotoIds.length > MAX_INTRO_PHOTOS ||
                    photos
                      .filter(photo => photo.isIntro)
                      .map(photo => photo.id)
                      .join(",") ===
                      photos
                        .filter(photo => introPhotoIds.includes(photo.id))
                        .map(photo => photo.id)
                        .join(",")
                  }
                >
                  {busy ? "Saving…" : "Save collage and animation"}
                </button>
                <a
                  className="admin-cancel"
                  href="/?previewIntro=1"
                  target="_blank"
                  rel="noreferrer"
                >
                  Preview opening animation
                </a>
                <button
                  className="admin-cancel"
                  type="button"
                  onClick={addPhoto}
                  disabled={busy}
                >
                  <ImagePlus size={15} /> Add a new gallery photo
                </button>
              </div>
            </>
          )}
        </section>

        <section className="admin-panel admin-editor" id="admin-photo-form">
          <div className="admin-editor__heading">
            <ImagePlus size={21} />
            <div>
              <h2>{editingPhoto ? "Edit photograph" : "Add a photograph"}</h2>
              <p>
                {editingPhoto
                  ? "Update its details or choose a replacement image."
                  : "Add a new image to the public gallery."}
              </p>
            </div>
          </div>
          <form className="admin-form" onSubmit={savePhoto}>
            <div className="admin-fields">
              <label className="admin-field">
                <span>Title</span>
                <input
                  maxLength={150}
                  required
                  value={metadata.title}
                  onChange={event =>
                    setMetadata({ ...metadata, title: event.target.value })
                  }
                />
              </label>
              <label className="admin-field">
                <span>Category</span>
                <input
                  maxLength={100}
                  required
                  value={metadata.category}
                  onChange={event =>
                    setMetadata({ ...metadata, category: event.target.value })
                  }
                />
              </label>
              <label className="admin-field admin-field--wide">
                <span>Alt text</span>
                <input
                  maxLength={255}
                  required
                  value={metadata.alt}
                  onChange={event =>
                    setMetadata({ ...metadata, alt: event.target.value })
                  }
                />
              </label>
              <label className="admin-field admin-field--wide">
                <span>Caption</span>
                <textarea
                  maxLength={500}
                  required
                  rows={3}
                  value={metadata.caption}
                  onChange={event =>
                    setMetadata({ ...metadata, caption: event.target.value })
                  }
                />
              </label>
              <label className="admin-field admin-field--wide">
                <span>
                  {editingPhoto ? "Replace image (optional)" : "Image"}
                </span>
                <input
                  ref={fileInputRef}
                  accept="image/jpeg,image/png,image/webp"
                  required={!editingPhoto}
                  type="file"
                  onChange={event => setFile(event.target.files?.[0] ?? null)}
                />
                <small>
                  JPEG, PNG or WebP, up to 10 MB. Images are resized before
                  upload.
                </small>
              </label>
            </div>
            <div className="admin-form__actions">
              <button
                className="button button--dark"
                type="submit"
                disabled={busy}
              >
                {busy
                  ? "Saving…"
                  : editingPhoto
                    ? "Save changes"
                    : "Add to gallery"}
              </button>
              {editingPhoto && (
                <button
                  className="admin-cancel"
                  type="button"
                  onClick={resetForm}
                  disabled={busy}
                >
                  <X size={15} /> Cancel edit
                </button>
              )}
            </div>
          </form>
        </section>

        <section
          className="admin-library"
          aria-labelledby="admin-library-title"
        >
          <div className="admin-library__heading">
            <h2 id="admin-library-title">Current photographs</h2>
            <span>
              {photos.length} {photos.length === 1 ? "photo" : "photos"}
            </span>
          </div>
          {photos.length === 0 ? (
            <p className="admin-status">No photographs are in the gallery.</p>
          ) : (
            <div className="admin-photo-grid">
              {photos.map(photo => (
                <article className="admin-photo-card" key={photo.id}>
                  <img src={photo.src} alt={photo.alt} loading="lazy" />
                  <div className="admin-photo-card__details">
                    <span>{photo.category}</span>
                    <strong>{photo.title}</strong>
                    {photo.isIntro && (
                      <span className="admin-photo-card__intro">
                        Opening animation photo
                      </span>
                    )}
                    <p>{photo.caption}</p>
                    <div className="admin-photo-card__actions">
                      <button
                        type="button"
                        onClick={() => editPhoto(photo)}
                        disabled={busy}
                      >
                        <Pencil size={14} /> Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => void deletePhoto(photo)}
                        disabled={busy}
                      >
                        <Trash2 size={14} /> Delete
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
