import type { Book, BookInput, FolderType, SectionType } from "@/lib/types"

export interface UploadEntry {
  file: File
  section: SectionType
  folder: FolderType
}

async function unwrap<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = `Request failed (${res.status})`
    try {
      const body = (await res.json()) as { error?: string }
      if (body?.error) message = body.error
    } catch {
      /* keep default */
    }
    throw new Error(message)
  }
  return (await res.json()) as T
}

function bookFormData(
  data: BookInput | null,
  entries: UploadEntry[],
): FormData {
  const fd = new FormData()
  if (data) {
    fd.set("title", data.title)
    fd.set("subtitle", data.subtitle ?? "")
    for (const c of data.categories) fd.append("categories", c)
    fd.set("pageLength", data.pageLength != null ? String(data.pageLength) : "")
  }
  for (const e of entries) {
    fd.append("files", e.file)
    fd.append("slots", `${e.section}:${e.folder}`)
  }
  return fd
}

export async function apiListBooks(): Promise<Book[]> {
  const { books } = await unwrap<{ books: Book[] }>(await fetch("/api/books"))
  return books
}

export async function apiGetBook(id: string): Promise<Book> {
  const { book } = await unwrap<{ book: Book }>(
    await fetch(`/api/books/${id}`),
  )
  return book
}

export async function apiListCategories(): Promise<string[]> {
  const { categories } = await unwrap<{ categories: string[] }>(
    await fetch("/api/categories"),
  )
  return categories
}

export async function apiCreateBook(
  data: BookInput,
  entries: UploadEntry[],
): Promise<Book> {
  const { book } = await unwrap<{ book: Book }>(
    await fetch("/api/books", { method: "POST", body: bookFormData(data, entries) }),
  )
  return book
}

export async function apiUpdateBook(
  id: string,
  data: BookInput,
): Promise<Book> {
  const { book } = await unwrap<{ book: Book }>(
    await fetch(`/api/books/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
  )
  return book
}

export async function apiAddFiles(
  id: string,
  entries: UploadEntry[],
): Promise<Book> {
  const { book } = await unwrap<{ book: Book }>(
    await fetch(`/api/books/${id}/files`, {
      method: "POST",
      body: bookFormData(null, entries),
    }),
  )
  return book
}

export async function apiDeleteBook(id: string): Promise<void> {
  await unwrap<{ ok: true }>(
    await fetch(`/api/books/${id}`, { method: "DELETE" }),
  )
}

type DeletePayload =
  | { fileIds: string[] }
  | { section: SectionType }
  | { section: SectionType; folder: FolderType }

export async function apiDeleteFiles(
  id: string,
  payload: DeletePayload,
): Promise<Book> {
  const { book } = await unwrap<{ book: Book }>(
    await fetch(`/api/books/${id}/files/delete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  )
  return book
}
