import { books, files, nextBookId } from "@/lib/db/collections"
import type { BookDoc } from "@/lib/db/collections"
import { bookRoot } from "@/lib/prefix-key"
import type { ExtraStatus, StatusFilter } from "@/lib/types"

function statusFromCounts(c: Record<string, number>): {
  finished: boolean
  extra: ExtraStatus | null
} {
  const coverFinal = c["cover/final"] ?? 0
  const interiorFinal = c["interior/final"] ?? 0
  const finished = coverFinal > 0 && interiorFinal > 0
  if (!finished) return { finished, extra: null }
  const n =
    ((c["cover/extra"] ?? 0) > 0 ? 1 : 0) +
    ((c["interior/extra"] ?? 0) > 0 ? 1 : 0)
  return { finished, extra: n === 2 ? "green" : n === 1 ? "yellow" : "red" }
}

export async function recomputeBook(bookId: string): Promise<void> {
  const fileCol = await files()
  const rows = await fileCol
    .aggregate<{ _id: { s: string; f: string }; n: number }>([
      { $match: { bookId } },
      {
        $group: {
          _id: { s: "$section", f: "$folder" },
          n: { $sum: 1 },
        },
      },
    ])
    .toArray()

  const slotCounts: Record<string, number> = {}
  for (const r of rows) slotCounts[`${r._id.s}/${r._id.f}`] = r.n
  const fileCount = rows.reduce((sum, r) => sum + r.n, 0)

  const col = await books()
  await col.updateOne(
    { bookId },
    {
      $set: {
        slotCounts,
        fileCount,
        status: statusFromCounts(slotCounts),
        updatedAt: new Date(),
      },
    },
  )
}

export interface ListFilter {
  q?: string
  category?: string
  status?: StatusFilter
}

export async function listBooks(filter: ListFilter = {}): Promise<BookDoc[]> {
  const col = await books()
  const query: Record<string, unknown> = {}

  if (filter.category && filter.category !== "all") {
    // matches when the book's categories array contains this value
    query.categories = filter.category
  }

  const q = filter.q?.trim()
  if (q) {
    const rx = { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" }
    query.$or = [{ title: rx }, { subtitle: rx }, { bookId: rx }]
  }

  const s = filter.status
  if (s === "finished") query["status.finished"] = true
  else if (s === "unfinished") query["status.finished"] = false
  else if (s === "extra:green") query["status.extra"] = "green"
  else if (s === "extra:yellow") query["status.extra"] = "yellow"
  else if (s === "extra:red") query["status.extra"] = "red"

  return col.find(query).sort({ createdAt: -1 }).toArray()
}

export async function getBookDoc(bookId: string): Promise<BookDoc | null> {
  const col = await books()
  return col.findOne({ bookId })
}

export interface CreateBookInput {
  title: string
  subtitle: string | null
  categories: string[]
  pageLength: number | null
}

export async function createBookDoc(
  input: CreateBookInput,
): Promise<BookDoc> {
  const bookId = await nextBookId()
  const now = new Date()
  const doc: BookDoc = {
    bookId,
    title: input.title,
    subtitle: input.subtitle,
    categories: input.categories,
    pageLength: input.pageLength,
    storagePrefix: bookRoot(bookId),
    drive: { rootFolderId: "", folders: {} },
    slotCounts: {},
    fileCount: 0,
    status: { finished: false, extra: null },
    createdAt: now,
    updatedAt: now,
  }
  const col = await books()
  const res = await col.insertOne(doc)
  return { ...doc, _id: res.insertedId }
}

export async function setBookDrive(
  bookId: string,
  drive: BookDoc["drive"],
): Promise<void> {
  const col = await books()
  await col.updateOne(
    { bookId },
    { $set: { drive, updatedAt: new Date() } },
  )
}

export async function updateBookDoc(
  bookId: string,
  patch: CreateBookInput,
): Promise<BookDoc | null> {
  const col = await books()
  return col.findOneAndUpdate(
    { bookId },
    {
      $set: {
        title: patch.title,
        subtitle: patch.subtitle,
        categories: patch.categories,
        pageLength: patch.pageLength,
        updatedAt: new Date(),
      },
    },
    { returnDocument: "after" },
  )
}

export async function deleteBookDoc(bookId: string): Promise<void> {
  const col = await books()
  await col.deleteOne({ bookId })
}
