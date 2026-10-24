# Project Notes

- Frontend stack: React, TypeScript, Tailwind. Build with `npm run build`; API entry point: `server/index.js`.
- Album contents are rendered by `src/components/media/AlbumModal.tsx`. Avoid mounting video elements for album previews; use static placeholders so scrolling does not trigger media metadata requests or video decoding.
- Album tiles should remain compact and have stable intrinsic dimensions. Keep text clipped within `min-w-0` grid cells to avoid wide or overlapping columns.
- Image tiles should use `thumbnailSrc`; `src` is the original and is for full-size viewing. The server caches WebP thumbnails with Sharp.
- Media and album deletion must enforce API authorization and remove associated stored files and cached thumbnails.
- Validate UI work with `npm run build` and `npx tsc --noEmit`; validate backend syntax with `node --check server/index.js`.
- Frontend data contracts are in `src/types/media.ts`; API requests and token storage belong in `src/lib/api.ts`. Keep authorization decisions on the server even when the UI hides unavailable actions.
- The server owns MongoDB models, API routes, media-file paths, thumbnail generation, and static-file serving in `server/index.js`. Uploaded filenames are generated from UUIDs; never use client-provided paths.
- For media cards and album previews, do not load video sources for previews. Use `thumbnailSrc` for images when present, keep cards dimensionally stable, and preserve `min-w-0` on grid children and their text containers.
- Before deleting a component, helper, or dependency as unused, search all imports and runtime references. Many files under `src/components/ui/` are reusable Radix wrappers and should only be removed when there are no consumers or intended public exports.
- Preserve the existing React/Tailwind visual patterns and Russian UI copy. Keep changes small unless a wider refactor has clear behavior-preserving tests or verification.
- Comments removed during refactoring should be retained here only when they explain non-obvious behavior or project constraints; do not copy routine code narration into this file.
- Do not commit generated `dist/` output or `tsconfig.tsbuildinfo`; check `git status` before and after validation because TypeScript may update its incremental build cache.
- Docker Compose exposes only the application port. MongoDB should remain on the private Compose network and its persisted volume must not be reused across incompatible major versions without a dump/restore.
- On a fresh database, set `ADMIN_PASSWORD` (at least 12 characters) before starting the server; never reintroduce a default credential. Media uploads are limited to 100 files and 20 MiB each, and server-side format checks are intentional security controls.
- Build with `npm run build` (includes TypeScript checking); use `npm run typecheck` for a type-only pass. Docker installs from both lockfiles with `npm ci`.
- The backend uses Express 4, so every async route handler must forward promise rejections to Express error middleware; keep this behavior when adding routes.
