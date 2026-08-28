import type { Collection, ObjectId } from "mongodb"
import { getDb } from "@/lib/db/mongo"
import type { ExtraStatus, FileKind, FolderType, SectionType } from "@/lib/types"

export interface CategoryDoc {
  _id?: ObjectId
  name: string
  slug: string
  createdAt: Date
  updatedAt: Date
}

export interface BookDoc {
  _id?: ObjectId
  bookId: string
  title: string
  subtitle: string | null
  categories: string[]
  pageLength: number | null
  storagePrefix: string
  drive: {
    rootFolderId: string
    /** "cover/final" -> Drive folder id */
    folders: Record<string, string>
  }
  /** "cover/final" -> count */
  slotCounts: Record<string, number>
  fileCount: number
  status: { finished: boolean; extra: ExtraStatus | null }
  createdAt: Date
  updatedAt: Date
}

export interface FileDoc {
  _id?: ObjectId
  bookId: string
  section: SectionType
  folder: FolderType
  kind: FileKind
  prefixKey: string
  storageKey: string
  name: string
  mimeType: string
  size: number
  checksum: string | null
  drive: {
    fileId: string
    parentFolderId: string
    webViewLink: string | null
  }
  createdAt: Date
  updatedAt: Date
}

export interface CounterDoc {
  _id: string
  seq: number
}

export async function books(): Promise<Collection<BookDoc>> {
  return (await getDb()).collection<BookDoc>("books")
}
export async function files(): Promise<Collection<FileDoc>> {
  return (await getDb()).collection<FileDoc>("files")
}
export async function categories(): Promise<Collection<CategoryDoc>> {
  return (await getDb()).collection<CategoryDoc>("categories")
}
export async function counters(): Promise<Collection<CounterDoc>> {
  return (await getDb()).collection<CounterDoc>("counters")
}

const globalForIndexes = globalThis as unknown as { __indexesReady?: Promise<void> }

export function ensureIndexes(): Promise<void> {
  if (!globalForIndexes.__indexesReady) {
    globalForIndexes.__indexesReady = (async () => {
      const [b, f, c] = await Promise.all([books(), files(), categories()])
      await Promise.all([
        b.createIndex({ bookId: 1 }, { unique: true }),
        b.createIndex({ categories: 1, createdAt: -1 }),
        b.createIndex({ "status.finished": 1, "status.extra": 1 }),
        b.createIndex(
          { title: "text", subtitle: "text" },
          { name: "book_text" },
        ),
        f.createIndex({ bookId: 1, section: 1, folder: 1 }),
        f.createIndex({ storageKey: 1 }, { unique: true }),
        f.createIndex({ "drive.fileId": 1 }, { unique: true }),
        c.createIndex({ slug: 1 }, { unique: true }),
      ])
    })().catch((err) => {
      // allow a retry on the next request if index creation failed
      globalForIndexes.__indexesReady = undefined
      throw err
    })
  }
  return globalForIndexes.__indexesReady
}

export async function nextBookId(): Promise<string> {
  const col = await counters()
  const res = await col.findOneAndUpdate(
    { _id: "book" },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: "after" },
  )
  const seq = res?.seq ?? 1
  return `book_${String(seq).padStart(3, "0")}`
}
