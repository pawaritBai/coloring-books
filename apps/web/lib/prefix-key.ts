import type { FolderType, SectionType } from "@/lib/types"

/**
 * Provider-agnostic "virtual path" for a book's files. MongoDB stores these keys;
 * Google Drive folder IDs are resolved from them via `book.drive.folders`.
 *
 *   bookRoot("book_001")                       -> "books/book_001"
 *   slotPrefix("book_001", "cover", "final")   -> "books/book_001/cover/final"
 *   storageKey(...)                            -> "books/book_001/cover/final/<id>__<safe>"
 */

export const STORAGE_ROOT = "books"

export function bookRoot(bookId: string): string {
  return `${STORAGE_ROOT}/${bookId}`
}

export function slotPrefix(
  bookId: string,
  section: SectionType,
  folder: FolderType,
): string {
  return `${bookRoot(bookId)}/${section}/${folder}`
}

/** e.g. "cover/final" — the key used in `book.drive.folders` and `slotCounts`. */
export function slotKey(section: SectionType, folder: FolderType): string {
  return `${section}/${folder}`
}

export function safeName(name: string): string {
  const trimmed = name.trim().toLowerCase()
  const cleaned = trimmed.replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "")
  return cleaned || "file"
}

export function storageKey(
  bookId: string,
  section: SectionType,
  folder: FolderType,
  fileId: string,
  name: string,
): string {
  return `${slotPrefix(bookId, section, folder)}/${fileId}__${safeName(name)}`
}
