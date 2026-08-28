import { z } from "zod"
import { FOLDERS, SECTIONS } from "@/lib/types"
import type { FolderType, SectionType } from "@/lib/types"

export interface ParsedBookInput {
  title: string
  subtitle: string | null
  categories: string[]
  pageLength: number | null
}

function toCategoryList(raw: unknown): string[] {
  const values = Array.isArray(raw) ? raw : raw == null ? [] : [raw]
  const out: string[] = []
  const seen = new Set<string>()
  for (const v of values) {
    if (typeof v !== "string") continue
    const clean = v.trim().replace(/\s+/g, " ")
    if (!clean) continue
    const key = clean.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(clean)
  }
  return out
}

/** Validate the text fields of a book (from multipart or JSON). */
export function parseBookInput(raw: {
  title?: unknown
  subtitle?: unknown
  categories?: unknown
  pageLength?: unknown
}): { ok: true; value: ParsedBookInput } | { ok: false; error: string } {
  const title = typeof raw.title === "string" ? raw.title.trim() : ""
  const categories = toCategoryList(raw.categories)
  const subtitleRaw =
    typeof raw.subtitle === "string" ? raw.subtitle.trim() : ""
  const pageRaw =
    typeof raw.pageLength === "string" || typeof raw.pageLength === "number"
      ? String(raw.pageLength).trim()
      : ""

  if (!title) return { ok: false, error: "Title is required." }
  if (categories.length === 0)
    return { ok: false, error: "At least one category is required." }

  let pageLength: number | null = null
  if (pageRaw) {
    const n = Number(pageRaw)
    if (!Number.isInteger(n) || n <= 0)
      return { ok: false, error: "Page length must be a positive whole number." }
    pageLength = n
  }

  return {
    ok: true,
    value: { title, subtitle: subtitleRaw || null, categories, pageLength },
  }
}

const sectionSchema = z.enum(SECTIONS)
const folderSchema = z.enum(FOLDERS)

export const deleteBodySchema = z.union([
  z.object({ fileIds: z.array(z.string().min(1)).min(1) }),
  z.object({ section: sectionSchema, folder: folderSchema }),
  z.object({ section: sectionSchema }),
])

export type DeleteBody = z.infer<typeof deleteBodySchema>

export function parseSlot(
  value: string,
): { section: SectionType; folder: FolderType } | null {
  const [section, folder] = value.split(":")
  const s = sectionSchema.safeParse(section)
  const f = folderSchema.safeParse(folder)
  if (!s.success || !f.success) return null
  return { section: s.data, folder: f.data }
}
