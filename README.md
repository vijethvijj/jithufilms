# Jithu Films — Wedding Photography & Cinematography

A responsive, cream-toned editorial portfolio built with React, Vite, TypeScript, plain CSS, GSAP ScrollTrigger, Express and Drizzle. It includes a first-session lens intro, interactive hero photos, a scroll-triggered shutter gallery, lightbox, playable video previews, service enquiry links and a booking form.

## Run and build

The managed project pins pnpm 10.18.0. With its project environment loaded, use:

```sh
pnpm install
pnpm dev
```

`pnpm dev` starts the Express server with Vite middleware on `PORT` or 3000. The public site, admin page, and their APIs are served from this same origin and port. Use `pnpm dev:static` only for a frontend-only preview; it defaults to port 3001 so it does not replace the admin-capable app on port 3000. The booking POST requires a database and applies the checked-in migrations first with `pnpm db:migrate`. Run `pnpm check` for TypeScript, `pnpm test` for Vitest, `pnpm build` for the production bundle, and `pnpm start` to serve `dist/`. The managed preview expects the server to listen on `0.0.0.0:3000`.

## Photos

The public gallery reads photo details from `shared/galleryPhotos.ts`. In local development, when `DATABASE_URL` is not set, the first gallery request copies those bundled entries into the ignored `.webdev/gallery.json` manifest. Database-backed deployments seed bundled entries when the gallery is first loaded; apply migrations with `pnpm db:migrate`.

The gallery manager is available at `/admin`. Configure the server-side `ADMIN_USERNAME`, `ADMIN_PASSWORD` (at least 12 characters), and `ADMIN_SESSION_SECRET` (at least 32 random characters) before signing in. The manager uses a signed, HTTP-only session cookie, same-origin checks, and rate-limits failed sign-in attempts. It supports adding, editing, replacing, and removing gallery photos, and selecting 6–8 photos for the homepage collage and first-visit opening animation. Other open homepage tabs refresh their gallery selection when the admin saves changes. Database-backed deployments need the gallery-photo migration before using this setting. `pnpm db:migrate` applies every pending migration, including `0004_gigantic_xavin.sql`, which drops the unused `customer_reviews` table; confirm that dropping any existing review data is acceptable before running it. Locally uploaded files are stored under `client/public/uploads`; database-backed image uploads use the configured managed storage service.

The homepage background image is `client/public/images/Background.jpeg`; replace that file to change the background while keeping its name. Other image/video files are in `client/public/images`. The live gallery photo details and initial entries are in `shared/galleryPhotos.ts`. Studio details and the photos used by service and film cards are configured in `client/src/data/siteConfig.ts`.

Set `studioConfig.email`, `whatsappUrl`, `instagramUrl` and `location` to the studio's real details before publishing. The current email (`studio@example.com`) is an explicit sample address. The WhatsApp and Instagram values are intentionally empty and their page links point back to the contact form until real studio URLs are added.

## Films and testimonials

The three default film cards are clearly labeled demo footage and play direct MP4 sources from free Pexels stock-video pages. The source-page and source-label values are held next to each record in `client/src/data/siteConfig.ts`. Review the linked source page and current Pexels license for each source before retaining them in a public commercial site. Replace each `videoSrc`, poster, duration, source page and label with the studio's own approved film assets when ready. The video player is HTML5; it shows an honest error message if a source is unavailable.

`client/src/components/Testimonials.tsx` currently displays clearly marked sample quotes. Replace them with client-approved copy and identify each couple/event accurately before removing the sample label; do not present demonstration content as verified reviews.

## Booking enquiries

The form posts JSON to `POST /api/enquiries`. The endpoint validates values on the server, rejects unexpected properties and a filled honeypot, rate-limits submissions, and saves successful enquiries to `booking_enquiries`. It intentionally exposes no public read route. The success state appears only after the database insert completes. There is no email delivery provider configured, so a successful submission is saved but does not generate an email alert; configure a studio-owned notification/email provider on the server before relying on email follow-up. The contact area calls this out so visitors are not told that an email alert is active.

Required fields are name, email, event type, event date and at least one selected service; phone, location and message may be omitted. Database enquiries contain contact details and event information. Follow the studio's retention and access policies when operating the site.

## Project structure

- `client/src/components/` contains the reusable page sections and interactions.
- `client/src/data/siteConfig.ts` contains replaceable media and studio configuration.
- `client/src/index.css` defines the normal CSS design system, responsive rules, and reduced-motion behavior.
- `server/enquiries.ts` and `server/enquiryValidation.ts` implement the public booking endpoint and validation.
- `drizzle/schema.ts` and `drizzle/` contain the enquiry schema and migration history.
- `client/public/manus-routes.json` declares the page route used by the current site.
