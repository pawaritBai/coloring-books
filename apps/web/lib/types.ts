export const SECTIONS = ["cover", "interior"] as const
export type SectionType = (typeof SECTIONS)[number]

export const FOLDERS = ["final", "extra"] as const
export type FolderType = (typeof FOLDERS)[number]

export const FILE_KINDS = ["image", "pdf"] as const
export type FileKind = (typeof FILE_KINDS)[number]

export const SECTION_LABELS: Record<SectionType, string> = {
  cover: "Cover",
  interior: "Interior",
}

export const FOLDER_LABELS: Record<FolderType, string> = {
  final: "Final",
  extra: "Extra",
}

/** A single stored file (image or pdf) that lives in one section/folder slot. */
export interface BookFile {
  id: string
  /** display name, e.g. the original file name */
  name: string
  /** file source url — `/api/files/<id>/content` once persisted, object url while pending */
  url: string
  kind: FileKind
  /** MIME type as reported by storage, when known */
  mimeType?: string
  section: SectionType
  folder: FolderType
  /** size in bytes, when known */
  size?: number
  addedAt: number
}

export interface Book {
  id: string
  title: string
  subtitle?: string
  /** one or more categories; always at least one */
  categories: string[]
  /** number of interior pages, optional */
  pageLength?: number
  createdAt: number
  updatedAt: number
  files: BookFile[]
}

/** The editable text fields of a book (create + edit forms). */
export interface BookInput {
  title: string
  subtitle?: string
  categories: string[]
  pageLength?: number
}

/* ------------------------------------------------------------------ */
/* Derived status                                                      */
/* ------------------------------------------------------------------ */

export type FinishStatus = "finished" | "unfinished"
/** Only meaningful once a book is `finished`. */
export type ExtraStatus = "green" | "yellow" | "red"

export function filesIn(
  book: Book,
  section?: SectionType,
  folder?: FolderType,
): BookFile[] {
  return book.files.filter(
    (f) =>
      (section === undefined || f.section === section) &&
      (folder === undefined || f.folder === folder),
  )
}

export function hasFinal(book: Book, section: SectionType): boolean {
  return filesIn(book, section, "final").length > 0
}

export function hasExtra(book: Book, section: SectionType): boolean {
  return filesIn(book, section, "extra").length > 0
}

/**
 * Status 1 — a book is `finished` only when BOTH the cover final and the
 * interior final contain at least one file.
 */
export function getFinishStatus(book: Book): FinishStatus {
  return hasFinal(book, "cover") && hasFinal(book, "interior")
    ? "finished"
    : "unfinished"
}

/**
 * Status 2 — only reported once a book is `finished`.
 *  - both cover & interior extras present  -> green
 *  - exactly one of them present           -> yellow
 *  - neither present                        -> red
 */
export function getExtraStatus(book: Book): ExtraStatus | null {
  if (getFinishStatus(book) !== "finished") return null
  const count = [hasExtra(book, "cover"), hasExtra(book, "interior")].filter(
    Boolean,
  ).length
  if (count === 2) return "green"
  if (count === 1) return "yellow"
  return "red"
}

export const EXTRA_STATUS_LABELS: Record<ExtraStatus, string> = {
  green: "Both extras",
  yellow: "One extra",
  red: "No extras",
}

/* ------------------------------------------------------------------ */
/* Library filtering                                                   */
/* ------------------------------------------------------------------ */

export type StatusFilter =
  | "all"
  | "finished"
  | "unfinished"
  | "extra:green"
  | "extra:yellow"
  | "extra:red"

export const STATUS_FILTER_LABELS: Record<StatusFilter, string> = {
  all: "Any status",
  finished: "Finished",
  unfinished: "Not finished",
  "extra:green": "Finished · both extras",
  "extra:yellow": "Finished · one extra",
  "extra:red": "Finished · no extras",
}

export function matchesStatusFilter(book: Book, filter: StatusFilter): boolean {
  if (filter === "all") return true
  const finish = getFinishStatus(book)
  if (filter === "finished") return finish === "finished"
  if (filter === "unfinished") return finish === "unfinished"
  return getExtraStatus(book) === filter.slice("extra:".length)
}

/* ------------------------------------------------------------------ */
/* Category colors — deterministic hue from the category name          */
/* ------------------------------------------------------------------ */

export function categoryHue(category: string): number {
  let hash = 0
  for (let i = 0; i < category.length; i += 1) {
    hash = (hash << 5) - hash + category.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash) % 360
}
