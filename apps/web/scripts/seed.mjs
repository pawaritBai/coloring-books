#!/usr/bin/env node
// Seed MongoDB + Google Drive with 6 demo books.
//
//   node --env-file=apps/web/.env.local apps/web/scripts/seed.mjs
//
// Idempotent: a bookId that already exists is skipped.

import { MongoClient, ObjectId } from "mongodb"
import { google } from "googleapis"
import { Readable } from "node:stream"

/* ---------- config ---------- */

const MONGODB_URI = process.env.MONGODB_URI
const MONGODB_DB = process.env.MONGODB_DB || "bookshelf"
if (!MONGODB_URI) {
  console.error("MONGODB_URI is not set (use --env-file=apps/web/.env.local).")
  process.exit(1)
}

const AUTH_MODE = process.env.GDRIVE_AUTH_MODE === "service" ? "service" : "oauth"
const SCOPES = ["https://www.googleapis.com/auth/drive"]
const FOLDER_MIME = "application/vnd.google-apps.folder"

function drive() {
  if (AUTH_MODE === "service") {
    const json = process.env.GOOGLE_CREDENTIALS_JSON
    const auth = new google.auth.GoogleAuth({
      scopes: SCOPES,
      ...(json
        ? { credentials: JSON.parse(json) }
        : {
            keyFile:
              process.env.GOOGLE_APPLICATION_CREDENTIALS || "./credentials.json",
          }),
    })
    return google.drive({ version: "v3", auth })
  }
  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_OAUTH_CLIENT_ID,
    process.env.GOOGLE_OAUTH_CLIENT_SECRET,
  )
  oauth2.setCredentials({ refresh_token: process.env.GOOGLE_OAUTH_REFRESH_TOKEN })
  return google.drive({ version: "v3", auth: oauth2 })
}

const allDrive =
  AUTH_MODE === "service"
    ? { supportsAllDrives: true, includeItemsFromAllDrives: true }
    : {}

function rootParent() {
  const r =
    process.env.GDRIVE_ROOT_FOLDER_ID ||
    (AUTH_MODE === "service" ? process.env.GDRIVE_SHARED_DRIVE_ID : undefined)
  if (!r) {
    console.error("Set GDRIVE_ROOT_FOLDER_ID (or GDRIVE_SHARED_DRIVE_ID).")
    process.exit(1)
  }
  return r
}

/* ---------- demo data ---------- */

const PDF_B64 =
  "JVBERi0xLjEKMSAwIG9iajw8L1R5cGUvQ2F0YWxvZy9QYWdlcyAyIDAgUj4+ZW5kb2JqCjIgMCBvYmo8PC9UeXBlL1BhZ2VzL0tpZHNbMyAwIFJdL0NvdW50IDE+PmVuZG9iagozIDAgb2JqPDwvVHlwZS9QYWdlL1BhcmVudCAyIDAgUi9NZWRpYUJveFswIDAgMzAwIDQwMF0vUmVzb3VyY2VzPDwvRm9udDw8L0YxIDQgMCBSPj4+Pi9Db250ZW50cyA1IDAgUj4+ZW5kb2JqCjQgMCBvYmo8PC9UeXBlL0ZvbnQvU3VidHlwZS9UeXBlMS9CYXNlRm9udC9IZWx2ZXRpY2E+PmVuZG9iago1IDAgb2JqPDwvTGVuZ3RoIDQ0Pj5zdHJlYW0KQlQgL0YxIDE4IFRmIDYwIDIwMCBUZCAoRmluYWwgcHJvb2YgUERGKSBUaiBFVAplbmRzdHJlYW0gZW5kb2JqCnRyYWlsZXI8PC9Sb290IDEgMCBSPj4KJSVFT0YK"

function svgBuffer(label, hue) {
  const s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 400">
    <rect width="300" height="400" fill="hsl(${hue} 65% 72%)"/>
    <circle cx="150" cy="150" r="66" fill="hsl(${hue} 80% 96%)" opacity="0.85"/>
    <text x="150" y="330" font-family="Georgia, serif" font-size="20"
      text-anchor="middle" fill="hsl(${hue} 55% 22%)">${label}</text>
  </svg>`
  return Buffer.from(s)
}

const CATEGORIES = ["Children", "Teenagers", "Adults", "Seniors", "Activity Books"]

const BOOKS = [
  {
    bookId: "book_001", title: "The Sleepy Little Fox",
    subtitle: "A bedtime coloring story",
    categories: ["Children", "Activity Books"], pageLength: 24,
    hue: 28, slots: { "cover/final": 1, "cover/extra": 2, "interior/final": 3, "interior/extra": 1 },
  },
  {
    bookId: "book_002", title: "Rainbow Garden", subtitle: null,
    categories: ["Children"], pageLength: 32, hue: 140,
    slots: { "cover/final": 1, "cover/extra": 1, "interior/final": 2 },
  },
  {
    bookId: "book_003", title: "Signal Lost", subtitle: "Cyberpunk line art",
    categories: ["Teenagers", "Adults"], pageLength: 48, hue: 250,
    slots: { "cover/final": 1, "interior/final": 4 },
  },
  {
    bookId: "book_004", title: "The Debate Club", subtitle: null,
    categories: ["Teenagers"], pageLength: null, hue: 210,
    slots: { "cover/final": 1, "cover/extra": 2 },
  },
  {
    bookId: "book_005", title: "Concrete Horizons", subtitle: "Architectural patterns",
    categories: ["Adults"], pageLength: 60, hue: 300,
    slots: { "cover/final": 1, "cover/extra": 1, "interior/final": 5, "interior/extra": 2 },
    coverFinalPdf: true,
  },
  {
    bookId: "book_006", title: "Gardens of Memory", subtitle: "Large-print florals",
    categories: ["Seniors", "Activity Books"], pageLength: null, hue: 96,
    slots: { "cover/extra": 2, "interior/extra": 1 },
  },
]

/* ---------- helpers ---------- */

function statusFromCounts(c) {
  const finished = (c["cover/final"] ?? 0) > 0 && (c["interior/final"] ?? 0) > 0
  if (!finished) return { finished, extra: null }
  const n =
    ((c["cover/extra"] ?? 0) > 0 ? 1 : 0) +
    ((c["interior/extra"] ?? 0) > 0 ? 1 : 0)
  return { finished, extra: n === 2 ? "green" : n === 1 ? "yellow" : "red" }
}

async function main() {
  const d = drive()
  const client = new MongoClient(MONGODB_URI)
  await client.connect()
  const db = client.db(MONGODB_DB)
  const booksCol = db.collection("books")
  const filesCol = db.collection("files")
  const catCol = db.collection("categories")

  const cache = new Map()
  async function ensureFolder(name, parentId) {
    const key = `${parentId}/${name}`
    if (cache.has(key)) return cache.get(key)
    const found = await d.files.list({
      q: `name='${name.replace(/'/g, "\\'")}' and '${parentId}' in parents and mimeType='${FOLDER_MIME}' and trashed=false`,
      fields: "files(id)",
      pageSize: 1,
      ...allDrive,
    })
    let id = found.data.files?.[0]?.id
    if (!id) {
      const created = await d.files.create({
        requestBody: { name, mimeType: FOLDER_MIME, parents: [parentId] },
        fields: "id",
        ...allDrive,
      })
      id = created.data.id
    }
    cache.set(key, id)
    return id
  }

  for (const name of CATEGORIES) {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
    await catCol.updateOne(
      { slug },
      { $setOnInsert: { name, slug, createdAt: new Date() }, $set: { updatedAt: new Date() } },
      { upsert: true },
    )
  }

  const storageRoot = await ensureFolder("books", rootParent())

  for (const b of BOOKS) {
    if (await booksCol.findOne({ bookId: b.bookId })) {
      console.log(`skip ${b.bookId} (exists)`)
      continue
    }
    console.log(`seeding ${b.bookId} — ${b.title}`)

    const bookFolderId = await ensureFolder(b.bookId, storageRoot)
    const folders = {}
    for (const section of ["cover", "interior"]) {
      const sec = await ensureFolder(section, bookFolderId)
      for (const folder of ["final", "extra"]) {
        folders[`${section}/${folder}`] = await ensureFolder(folder, sec)
      }
    }

    const now = new Date()
    await booksCol.insertOne({
      bookId: b.bookId,
      title: b.title,
      subtitle: b.subtitle,
      categories: b.categories,
      pageLength: b.pageLength,
      storagePrefix: `books/${b.bookId}`,
      drive: { rootFolderId: bookFolderId, folders },
      slotCounts: {},
      fileCount: 0,
      status: { finished: false, extra: null },
      createdAt: now,
      updatedAt: now,
    })

    const slotCounts = {}
    for (const [slot, count] of Object.entries(b.slots)) {
      const [section, folder] = slot.split("/")
      for (let i = 0; i < count; i += 1) {
        const _id = new ObjectId()
        const isPdf = b.coverFinalPdf && slot === "cover/final"
        const buffer = isPdf
          ? Buffer.from(PDF_B64, "base64")
          : svgBuffer(`${b.title} ${folder} ${i + 1}`, (b.hue + i * 20) % 360)
        const mimeType = isPdf ? "application/pdf" : "image/svg+xml"
        const ext = isPdf ? "pdf" : "svg"
        const name = `${section}_${folder}_${String(i + 1).padStart(2, "0")}.${ext}`
        const driveName = `${_id.toHexString()}__${name}`

        const up = await d.files.create({
          requestBody: { name: driveName, parents: [folders[slot]] },
          media: { mimeType, body: Readable.from(buffer) },
          fields: "id, webViewLink, md5Checksum, size",
          ...allDrive,
        })

        await filesCol.insertOne({
          _id,
          bookId: b.bookId,
          section,
          folder,
          kind: isPdf ? "pdf" : "image",
          prefixKey: `books/${b.bookId}/${section}/${folder}`,
          storageKey: `books/${b.bookId}/${section}/${folder}/${_id.toHexString()}__${name}`,
          name,
          mimeType,
          size: up.data.size ? Number(up.data.size) : buffer.byteLength,
          checksum: up.data.md5Checksum ?? null,
          drive: {
            fileId: up.data.id,
            parentFolderId: folders[slot],
            webViewLink: up.data.webViewLink ?? null,
          },
          createdAt: now,
          updatedAt: now,
        })
      }
      slotCounts[slot] = count
    }

    await booksCol.updateOne(
      { bookId: b.bookId },
      {
        $set: {
          slotCounts,
          fileCount: Object.values(slotCounts).reduce((a, c) => a + c, 0),
          status: statusFromCounts(slotCounts),
          updatedAt: new Date(),
        },
      },
    )
  }

  // keep the id counter ahead of the highest seeded book so the app's
  // nextBookId() doesn't collide with book_001..book_00N
  const maxSeq = BOOKS.reduce((m, b) => {
    const n = Number(b.bookId.replace(/\D/g, ""))
    return Number.isFinite(n) && n > m ? n : m
  }, 0)
  const counters = db.collection("counters")
  const cur = await counters.findOne({ _id: "book" })
  if (!cur || (cur.seq ?? 0) < maxSeq) {
    await counters.updateOne(
      { _id: "book" },
      { $set: { seq: maxSeq } },
      { upsert: true },
    )
  }

  await client.close()
  console.log("done.")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
