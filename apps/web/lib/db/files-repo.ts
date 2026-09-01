import { ObjectId } from "mongodb"
import { files } from "@/lib/db/collections"
import type { FileDoc } from "@/lib/db/collections"
import type { FolderType, SectionType } from "@/lib/types"

export async function filesForBook(bookId: string): Promise<FileDoc[]> {
  const col = await files()
  return col
    .find({ bookId })
    .sort({ section: 1, folder: 1, createdAt: 1 })
    .toArray()
}

export async function insertFile(doc: FileDoc): Promise<FileDoc> {
  const col = await files()
  const res = await col.insertOne(doc)
  return { ...doc, _id: doc._id ?? res.insertedId }
}

export async function insertFiles(docs: FileDoc[]): Promise<void> {
  if (docs.length === 0) return
  const col = await files()
  await col.insertMany(docs)
}

/** Delete files and return the docs that were removed (for Drive cleanup). */
async function removeWhere(filter: Record<string, unknown>): Promise<FileDoc[]> {
  const col = await files()
  const docs = await col.find(filter).toArray()
  if (docs.length > 0) {
    await col.deleteMany({ _id: { $in: docs.map((d) => d._id) } })
  }
  return docs
}

export async function deleteFilesByIds(
  bookId: string,
  ids: string[],
): Promise<FileDoc[]> {
  const objectIds = ids
    .filter((id) => ObjectId.isValid(id))
    .map((id) => new ObjectId(id))
  if (objectIds.length === 0) return []
  return removeWhere({ bookId, _id: { $in: objectIds } })
}

export function deleteSlot(
  bookId: string,
  section: SectionType,
  folder: FolderType,
): Promise<FileDoc[]> {
  return removeWhere({ bookId, section, folder })
}

export function deleteSection(
  bookId: string,
  section: SectionType,
): Promise<FileDoc[]> {
  return removeWhere({ bookId, section })
}

export function deleteAllForBook(bookId: string): Promise<FileDoc[]> {
  return removeWhere({ bookId })
}

export async function findFileById(id: string): Promise<FileDoc | null> {
  if (!ObjectId.isValid(id)) return null
  const col = await files()
  return col.findOne({ _id: new ObjectId(id) })
}
