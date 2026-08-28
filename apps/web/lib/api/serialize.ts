import type { BookDoc, FileDoc } from "@/lib/db/collections"
import type { Book, BookFile } from "@/lib/types"

export function serializeFile(doc: FileDoc): BookFile {
  const id = String(doc._id)
  return {
    id,
    name: doc.name,
    url: `/api/files/${id}/content`,
    kind: doc.kind,
    mimeType: doc.mimeType,
    section: doc.section,
    folder: doc.folder,
    size: doc.size,
    addedAt: doc.createdAt.getTime(),
  }
}

export function serializeBook(doc: BookDoc, docFiles: FileDoc[]): Book {
  return {
    id: doc.bookId,
    title: doc.title,
    subtitle: doc.subtitle ?? undefined,
    categories: doc.categories ?? [],
    pageLength: doc.pageLength ?? undefined,
    createdAt: doc.createdAt.getTime(),
    updatedAt: doc.updatedAt.getTime(),
    files: docFiles.map(serializeFile),
  }
}
