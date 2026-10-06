# Aperture

A responsive image workspace with rectangle and brush selections, grounded image questions, real model edits, separate Ask/Edit history, comparison, undo, and PNG download.

## Run locally

Requires Node.js 22.13+ (Node 24 recommended) and npm. Run commands in the repository root, the directory containing `package.json`.

Download the repository using GitHub's **Code → Download ZIP**, extract it, and open a terminal in that folder. You can also use `git clone` with the URL shown under **Code**; private repositories require signing in to your GitHub account.

```sh
npm ci
```

Copy `.env.example` to `.env`, then set:

```dotenv
OPENAI_API_KEY=your-own-openai-api-key
OPENAI_ASK_MODEL=gpt-4.1-mini
OPENAI_EDIT_MODEL=gpt-image-2
```

On Windows PowerShell, copy with `Copy-Item .env.example .env`, then run `notepad .env`. Paste your key after `OPENAI_API_KEY=` and save the file. On macOS/Linux, use `cp .env.example .env` and open `.env` in your text editor. Do not overwrite an existing configured `.env` unnecessarily. The real `.env` stays on your computer and is excluded from GitHub.

```sh
npm run dev
```

Open **http://localhost:5173**. Restart after changing credentials. You need an OpenAI API account with billing and access to the configured vision and image-editing models. ChatGPT subscription usage is separate from API billing. No key is included. Without a key, upload/selection/download work and Ask/Edit return a useful setup error; they never return fake answers or edits.

```sh
npm test
npm run typecheck
npm run build
npm start
```

`npm start` previews the built Cloudflare Worker locally; use its printed URL. The app uses React, TypeScript, Vinext/Vite, the Next App Router conventions, and the starter's Cloudflare runtime. Production hosting must support that Worker output. Keep a deployed instance private or put authentication and rate limits in front of the paid routes; same-origin validation is not user authentication. Configure the API key as a host secret, never as a public environment variable. This project has not been published with live credentials.

## How it works

- Upload JPG, PNG, or WebP up to 20 MiB. Browser decoding applies EXIF orientation once. Images over 40 megapixels or 16,000 pixels per edge are rejected after decoding. The working image is reduced to a maximum 1,536-pixel edge; the UI shows its actual dimensions. Animated inputs are treated as still images.
- The image and overlay occupy exactly the same rectangle. Pointer positions map through its actual CSS bounds to canonical image pixels, including at zoom. Touch/pen selection uses pointer capture and tracks the active pointer. Brush clicks and round-ended strokes create an alpha mask.
- **Ask** posts the original working PNG, selection metadata, a highlighted overview, and a bounding crop to `/api/ask`. The server calls OpenAI's Responses API. Prior answers are included only for the same image version and exact selection geometry. Each history item stores its selection snapshot and source version.
- **Edit** posts an image and transparent selection mask to `/api/edit`, which calls the real OpenAI Images Edit API. A padded 1024×1024, 1536×1024, or 1024×1536 model canvas keeps aspect ratio stable. Returned dimensions are validated, padding is cropped away, and the selected content is resampled to the working dimensions.
- Masks guide the model but do not guarantee exact boundaries. The app additionally composites the returned content against the immutable source RGBA buffer. Zero-coverage pixels retain their original working-image bytes, including across repeated edits and for transparent pixels. Direct PNG encoding avoids another canvas rounding pass. Antialiased mask edges blend; seams may remain. Select some surrounding space for object removal. Whole-image edits may change any part of the working image.
- Before/after compares the current edit with its preceding version. Undo restores that version; the edit stays in history as undone. Download exports the active working version as PNG, not the original full-resolution upload.
- Images/history live in tab memory only. New images reset the session after a confirmation when needed. Refreshing clears the session. Up to 10 active edits are retained. Download before leaving.

API keys remain in server routes. Requests have streaming body-size caps, PNG header/chunk/dimension checks, metadata validation, same-origin checks, provider deadlines, and sanitized errors. Failed/cancelled operations do not replace the current image. Submitted provider operations may still incur charges after cancellation; the app never retries automatically. The app does not persist uploads, but OpenAI's processing and retention policies still apply. Responses calls use `store:false`.

## Shortcuts

`R`: rectangle · `B`: brush · `Ctrl/Cmd+Z`: undo selection, then edit · `Ctrl/Cmd+Enter`: submit · `Escape`: cancel drawing/close comparison.

## Verification

`npm test` runs 13 checks for coordinates, reverse rectangles, brush bounds, padding, pixel preservation, transparent PNG encoding, stream limits, invalid images, missing credentials, origin/duplicate-field rejection, Ask/Edit request contracts, provider errors, and invalid output dimensions. Contract tests use an injected test transport; production routes always call OpenAI.

An isolated browser suite exercises real canvas/bitmap behavior without model calls:

```sh
node tests/prepare-browser.mjs
# With npm run dev running, open:
# http://localhost:5173/_aperture-verification.html
# Click Run browser checks.
node tests/prepare-browser.mjs --clean
```

Remove the generated verification page before a production build. See `PROGRESS.md` for completed checks and remaining credential blockers.

API behavior follows the official [vision guide](https://developers.openai.com/api/docs/guides/images-vision) and [image editing guide](https://developers.openai.com/api/docs/guides/image-generation).

## GitHub and hosting

This repository includes the complete application, server routes, tests, dependency lockfile, and setup guide. GitHub stores the code; it does not start the application or supply an OpenAI API key. GitHub Pages cannot run the server routes this app needs. Use the local setup above, or a compatible Cloudflare Worker host with `OPENAI_API_KEY` configured as a server secret. Do not put the key in a commit, issue, README, or browser environment variable.
