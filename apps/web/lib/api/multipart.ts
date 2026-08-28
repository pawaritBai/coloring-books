import { parseSlot } from "@/lib/api/validation"
import type { IncomingFile } from "@/lib/api/ingest"

export interface BookMultipart {
  fields: {
    title?: string
    subtitle?: string
    categories: string[]
    pageLength?: string
  }
  files: IncomingFile[]
  /** slot strings that failed to parse */
  badSlots: string[]
}

/**
 * Shape sent by the client:
 *   title, subtitle, pageLength   — text fields
 *   categories[]                  — one per category (repeated)
 *   files[]                       — one File per upload
 *   slots[]                       — one "section:folder" string per file, same order
 */
export async function parseBookMultipart(
  request: Request,
): Promise<BookMultipart> {
  const form = await request.formData()

  const str = (key: string): string | undefined => {
    const v = form.get(key)
    return typeof v === "string" ? v : undefined
  }

  const rawFiles = form.getAll("files")
  const rawSlots = form.getAll("slots").map((s) => String(s))

  const files: IncomingFile[] = []
  const badSlots: string[] = []

  rawFiles.forEach((entry, i) => {
    if (!(entry instanceof File) || entry.size === 0) return
    const slotStr = rawSlots[i] ?? ""
    const slot = parseSlot(slotStr)
    if (!slot) {
      badSlots.push(slotStr)
      return
    }
    files.push({ file: entry, section: slot.section, folder: slot.folder })
  })

  return {
    fields: {
      title: str("title"),
      subtitle: str("subtitle"),
      categories: form.getAll("categories").map((c) => String(c)),
      pageLength: str("pageLength"),
    },
    files,
    badSlots,
  }
}
