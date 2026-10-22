# Jithu Films — Website Plan

## Product and implementation

Build a single-page, responsive wedding-photography studio website in the initialized React 19 + Vite + TypeScript application. Keep the existing Express/Drizzle managed server and database for a real booking-enquiry POST endpoint; add a narrowly scoped enquiries table and server-side validation. No login or public enquiry-list endpoint is needed. Do not claim a form submission succeeded until the database insert succeeds. No mail provider or studio email has been supplied, so the project explicitly documents that persistent storage works but automatic email notification requires the studio to configure a provider.

Use normal CSS rather than Tailwind utilities or a utility framework. Retain the project's installed UI infrastructure only where useful; add GSAP + ScrollTrigger for the pinned, short gallery sequence and scroll-driven film strip; use the already installed Lucide React icon set. No Three.js. Use CSS/SVG for an aperture motif, reduced-motion alternatives and the introductory lens animation. Keep source modular and dispose of scroll triggers and listeners during cleanup.

A central `client/src/data/siteConfig.ts` holds business contact/social settings and replaceable image/video paths; gallery, service and film content live in small data modules. Place reusable feature components under `client/src/components/` (intro, navigation, photo composition, about, gallery, film modal, services, process, testimonials, booking form, footer, and accessible lightbox); compose them from the Home route. Put the enquiry table/types/migration in `drizzle/` and its persistence/validation/HTTP handler alongside the existing `server/` routes. Add the `/manus-routes.json` page manifest before starting Preview.

Generate distinct, temporary wedding-editorial demo photographs for the hero stack, about section and gallery, upload them to project-managed storage and reference the returned paths unchanged. Four demo film cards use direct, HTTP-verified MP4 previews from free Pexels stock pages: a first-look clip, an outdoor ceremony clip, a wedding-dance clip and an outdoor couple-embrace clip. Each card and source link identifies the preview as stock demonstration footage; replace the source, poster, duration and attribution with approved studio footage when available. Label sample testimonials as samples, never as verified. Replace unsupplied business details with editable, visibly marked placeholders or an unconfigured state.

## Design system

- **Design movement:** Contemporary luxury wedding editorial, filtered through warm analogue-film and contact-sheet motifs.
- **Core principles:** Emotion before ornament; editorial asymmetry; quiet, legible controls; every motion should feel photographic.
- **Color philosophy:** Ivory and warm cream create the feel of album paper and a calm gallery; charcoal keeps text clear; muted champagne gold is a restrained focus/selection color, not a metallic effect. Base `#F5F0E8`, ink `#29251F`, accent `#B69A70`, with soft beige and black accents.
- **Layout paradigm:** An asymmetric editorial spread: copy occupies a quiet left column, image clusters float to the right, and lower sections vary between split narratives, pinned viewfinder moments, image-led grids and an open horizontal process line.
- **Signature elements:** Thin aperture wordmark; viewfinder focus brackets/gold focus ring; subtle film-edge/index and frame-number details.
- **Interaction philosophy:** Images respond as prints with physical weight and settle gracefully. Controls stay discoverable and keyboard accessible; pointer-only flourishes become tap-to-toggle or static layouts on touch.
- **Animation:** Short opacity/transform reveals; one per-session 3–4-second skippable lens intro that zooms into a wedding photograph; controlled photo separation from measured pointer distance; scroll-linked shutter changes in a naturally scrollable, temporarily pinned gallery; subtle scroll-driven film-strip movement; respect `prefers-reduced-motion` by avoiding pinning and simplifying transitions.
- **Typography system:** Cormorant Garamond for display and editorial headings paired with DM Sans for navigation, labels and body copy; generous line-height and restrained letter spacing.
- **Brand essence:** Personal wedding stories told as composed stills and intimate films; cinematic, attentive, timeless.
- **Brand voice:** Quiet, sincere and specific. Examples: “Every Frame Tells a Story.” / “The small moments deserve to be remembered, too.”
- **Wordmark & logo:** Custom text wordmark “JITHU FILMS” paired with a minimal 8-blade aperture drawn in inline SVG/CSS; no generated lettering.
- **Signature brand color:** Muted champagne gold `#B69A70`, used sparingly for focus and interaction.

## Project structure

- `client/src/App.tsx`, `client/src/pages/Home.tsx`: single public page and section composition.
- `client/src/components/`: reusable navigation, intro, hero/photo stack, story, gallery/lightbox, films/modal, service/process/testimonial, booking and footer components.
- `client/src/data/`: replaceable studio configuration, gallery/film entries and service copy.
- `client/src/hooks/`: reserved for small interaction hooks where reuse is justified.
- `client/src/index.css`: normal CSS design tokens, responsive layout, focus styles and motion rules.
- `client/public/manus-routes.json`: current page-route declaration, `/` only.
- `server/`: validated public booking endpoint and database insert; no public reads.
- `drizzle/`: additive enquiries-table schema and checked-in migration.
- `README.md`: local setup, run/build commands, asset/business-detail replacement, contact-form behavior and notification integration notes.

## Material constraints and decisions

Studio phone, email, Instagram, address, actual photographs, film files and verified client testimonials were not supplied. Use generated demo photographs, clearly identified sample quotes, and clearly replaceable/unconfigured contact/media values; do not invent real claims or reviews. Database-backed enquiry persistence is implemented; email delivery is not configured. The website remains a Preview handoff; publication is not part of this task. Preserve the project's configured server/database/runtime settings and starter behavior not needed for the public page.
