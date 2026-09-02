# Bookshelf

A file archive for a coloring-book studio. Every title's production art is stored
the way it's actually produced — a **Cover** and an **Interior**, each split into a
**Final** folder and an **Extra** folder for drafts and work-in-progress — and each
book's completion state is derived from what's in those folders.

Metadata lives in **MongoDB**; the image and PDF bytes live in **Google Drive**.
The app is the source of truth for the structure and mirrors it into Drive folders.

> Full-stack side project. Next.js 16 (App Router) · React 19 · TypeScript ·
> MongoDB · Google Drive API · Docker.

---

## Screens

| Library | Book view | Batch upload |
| --- | --- | --- |
| _add screenshot_ | _add screenshot_ | _add screenshot_ |

---

## Features

**Library**
- Grid of books; filter by category (a book can belong to several), by derived
  status, and search by title / subtitle / id.

**Book view**
- File-explorer layout: pick a `Cover`/`Interior` · `Final`/`Extra` folder in a
  rail, browse its files on the right.
- Lightbox for images, inline viewer for PDFs, keyboard navigation.

**Batch upload**
- Add several books in one pass — an accordion of draft cards, each validated
  independently.
- **Drag files from the desktop** onto any slot, or click to browse.
- One **Create N books** action uploads them (two at a time) and shows a live
  per-book progress panel: _waiting → uploading → created / failed_.
- A failed book keeps its data and can be fixed and retried without redoing the
  rest.

**Edit &amp; manage**
- Edit metadata and add more files.
- A dedicated delete surface: remove a whole section (its Final **and** Extra), a
  single folder, or hand-picked files — each behind a confirmation dialog and a
  success toast.

**Derived status**
- A book is **finished** only when both the Cover-final and Interior-final hold a
  file.
- Once finished, an **extra-completeness** signal: 🟢 both sections have extras,
  🟡 one, 🔴 none. Both are filterable in the library.

**Auth**
- Login only — no sign-up anywhere. Users are provisioned with a CLI script.
- Session is a signed JWT (`jose`) in an `httpOnly` cookie; passwords are
  `bcrypt`-hashed.
- Next middleware (`proxy.ts`) guards pages; every data route calls
  `requireSession()` as defense in depth.

**UX safety**
- Unsaved-changes prompt when navigating away from a form.
- Full-screen blocking overlay while an upload is in flight.

---

## Architecture

```
 anywhere            Cloudflare            your host (Docker)
┌─────────┐  HTTPS  ┌──────────┐  tunnel  ┌──────────────────────────────┐
│ browser │────────▶│   edge   │─────────▶│ cloudflared ──▶ web (Next.js) │
└─────────┘         └──────────┘          └───────────────────┬──────────┘
                                                              │
                                            ┌─────────────────┴───────────────┐
                                            ▼                                 ▼
                                    ┌───────────────┐                 ┌───────────────┐
                                    │ MongoDB Atlas │                 │  Google Drive │
                                    │   metadata    │                 │  image / PDF  │
                                    └───────────────┘                 └───────────────┘
```

- **`web`** — the whole app: pages and API routes, run as a plain Node server
  (no serverless body-size or timeout limits).
- **`cloudflared`** — a Cloudflare Tunnel sidecar. The host dials **out** to
  Cloudflare, so the app is reachable over public HTTPS with no port-forwarding
  and works behind CGNAT.
- **MongoDB** — `books`, `files`, `categories`, `users`. A `files` document
  records its section/folder, a virtual `storageKey`, and its Drive file id.
- **Google Drive** — the bytes, under `books/<id>/<cover|interior>/<final|extra>/`,
  reached with a server-side OAuth refresh token.

### Upload pipeline

Uploads are dominated by Google Drive API latency (~2 s per call, size-independent),
so the write path parallelises everything it can:

```
                ┌─ parse multipart body ───────┐
POST /api/books ┤        (concurrent)           ├─▶ upload files ─▶ write ─▶ 201
                └─ create 4 Drive folders ──────┘   (12 at once)   MongoDB
```

The book id is reserved up front so folder creation overlaps body parsing;
sibling folders are created in parallel; files upload with a concurrency of 12.
A 5-file book of 2 MB scans went from **~14 s → ~6 s**, and the time no longer
scales with the number of files.

---

## Stack

| Area | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS v4, [Base UI](https://base-ui.com) primitives |
| Monorepo | Turborepo — `apps/web` + `packages/ui` |
| Database | MongoDB (Atlas), official `mongodb` driver |
| File storage | Google Drive API (`googleapis`), OAuth 2.0 |
| Auth | `jose` (JWT), `bcryptjs` |
| Validation | `zod` |
| Deploy | Docker + Docker Compose, Cloudflare Tunnel |

---

## Running locally

**Prerequisites:** Node 20+, a MongoDB connection string, a Google Cloud project
with the Drive API enabled.

```bash
git clone https://github.com/pawaritBai/coloring-books.git
cd coloring-books
npm install
cp apps/web/.env.example apps/web/.env.local   # then fill it in
```

`apps/web/.env.local`:

```
MONGODB_URI=...
MONGODB_DB=bookshelf
AUTH_SECRET=            # openssl rand -base64 32

GDRIVE_AUTH_MODE=oauth
GDRIVE_ROOT_FOLDER_ID=  # a folder id from your Drive
GOOGLE_OAUTH_CLIENT_ID=
GOOGLE_OAUTH_CLIENT_SECRET=
GOOGLE_OAUTH_REFRESH_TOKEN=
```

```bash
# one-time: obtain the Drive refresh token
node --env-file=apps/web/.env.local apps/web/scripts/get-drive-refresh-token.mjs

# create a login user (there is no sign-up screen)
node --env-file=apps/web/.env.local apps/web/scripts/add-user.mjs \
  --email you@example.com --username you --password "at-least-8-chars"

# optional: seed 6 demo books
node --env-file=apps/web/.env.local apps/web/scripts/seed.mjs

npm run dev        # http://localhost:3000
```

Checks: `npm run typecheck` · `npm run lint` · `npm run build`

---

## Deploying with Docker

`docker-compose.yml` runs the app plus a Cloudflare Tunnel:

```bash
docker compose up -d --build
docker compose logs -f tunnel     # prints the public https URL
```

The `web` service builds from the `Dockerfile` (a plain `next start` server);
`env_file` injects `apps/web/.env.local` at runtime — nothing secret is baked
into the image. Swapping the tunnel for a named tunnel + custom domain, or
retargeting the same `Dockerfile` at Railway / Fly.io, is a config change only.

---

## Project layout

```
apps/web/
  app/
    api/                REST routes — books, files, categories, auth
    books/[id]/         detail · edit · delete pages
    login/  upload/
    proxy.ts            page-level auth middleware
  components/           React components (client)
  lib/
    db/                 MongoDB repositories
    drive/              Google Drive service (auth, folders, upload, stream)
    auth/               JWT session, requireSession, users repo
    api/                request parsing, upload orchestration, serialization
    prefix-key.ts       provider-agnostic storage paths
    types.ts            shared types + status derivation
  scripts/              add-user · get-drive-refresh-token · seed
packages/ui/            shared component library (Base UI + Tailwind)
```
