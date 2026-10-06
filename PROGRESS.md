# Aperture progress

## 2026-09-23

- Inspected the empty workspace; created the React/TypeScript/Vinext app in this directory.
- Built upload validation/orientation normalization, large image viewer, rectangle/brush selection, whole-image mode, clear, selection undo, zoom, and PNG download.
- Connected real server-side OpenAI Ask and Edit routes. Added selection snapshots, separate histories, request/loading/error/cancel states, before/after comparison, and edit undo.
- Added server-only `.env.example`, setup instructions, upload/request limits, provider timeouts, and documented mask/resampling limitations.
- Reviewed and fixed selection-history leakage between different shapes sharing a bounding box, secondary-pointer interference, and transparent-pixel drift across repeated edits. Reran the 13-check test suite successfully after fixes; TypeScript and the production build passed during implementation.
- Used the desktop app: uploaded a PNG, drew rectangle and brush selections, sent Ask and Edit requests, checked actionable missing-key errors and independent history, and verified whole-image WebMCP state changes and invalid-input rejection.
- Ran the isolated browser verification suite: **9/9 passed**, covering canvas masks, cropping/compositing, all eight EXIF orientations, invalid inputs, and preservation of transparent pixels across successive edits.
- Checked the 390-pixel phone layout: conversation follows the viewer, with no horizontal overflow. Restored the desktop viewport afterward.
- Final automated rerun: **13/13 passed**, `npm run typecheck` passed, and the final production build passed. Removed the generated local verification page before building.

## 2026-10-05 — GitHub preparation

- Initialized the application as a Git repository on `main`; included the complete source, dependency lockfile, tests, required build plugin, and setup files.
- Added normalized text line endings and ignores for Wrangler secret files. Verified that `.env`, dependencies, build outputs, and checkout-local runtime files are excluded; `.env.example` is included.
- Updated setup instructions for a fresh GitHub download, including Windows `.env` editing and the distinction between source storage and server hosting.
- Reran automated checks: **13/13 passed** and TypeScript passed.
- Started the development server and checked `/api/status`: **configured:false**. Live model tests remain blocked by an empty API key; no paid model calls were made.
- Prepared the complete application for GitHub, with API keys excluded. The repository was initially unavailable; the owner has now created `HadesAGS/IM.Ai` (public) as the publication target.

## 2026-10-05 — GitHub upload

- Verified access to `HadesAGS/IM.Ai` and initialized its `main` branch.
- Completed a fresh read-only source audit: no detected secret signatures or local user-home paths; dependency manifest and lockfile match, and portable execution works without checkout-local configuration.
- Prepared all 118 tracked source, test, documentation, and configuration files for upload. GitHub stores the application source; local or compatible server hosting is still required to run it.

## Blocked

No `OPENAI_API_KEY` is configured. Live model answer quality, actual generated edits, and a successful paid round trip are unverified. No live deployment was completed. Per the requested stopping condition, further model-dependent work stops until a server key with billing/model access is available. No speculative features or recurring automation were added.
