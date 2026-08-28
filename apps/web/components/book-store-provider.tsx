"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import type { Book, BookInput, FolderType, SectionType } from "@/lib/types"
import {
  apiAddFiles,
  apiCreateBook,
  apiDeleteBook,
  apiDeleteFiles,
  apiGetBook,
  apiListBooks,
  apiListCategories,
  apiUpdateBook,
  type UploadEntry,
} from "@/lib/api-client"

export type { BookInput } from "@/lib/types"

interface BookStore {
  books: Book[]
  categories: string[]
  loading: boolean
  error: string | null
  refreshAll: () => Promise<void>
  getBook: (id: string) => Book | undefined
  refreshBook: (id: string) => Promise<Book | undefined>
  addBook: (input: BookInput & { files: UploadEntry[] }) => Promise<string>
  updateBook: (id: string, patch: BookInput) => Promise<void>
  addFiles: (bookId: string, files: UploadEntry[]) => Promise<void>
  deleteBook: (id: string) => Promise<void>
  deleteFiles: (bookId: string, fileIds: string[]) => Promise<void>
  deleteFolder: (
    bookId: string,
    section: SectionType,
    folder: FolderType,
  ) => Promise<void>
  deleteSection: (bookId: string, section: SectionType) => Promise<void>
}

const BookStoreContext = createContext<BookStore | null>(null)

export function BookStoreProvider({ children }: { children: ReactNode }) {
  const [books, setBooks] = useState<Book[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const upsertBook = useCallback((book: Book) => {
    setBooks((prev) => {
      const i = prev.findIndex((b) => b.id === book.id)
      if (i === -1) return [book, ...prev]
      const next = [...prev]
      next[i] = book
      return next
    })
  }, [])

  const refreshAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [b, c] = await Promise.all([apiListBooks(), apiListCategories()])
      setBooks(b)
      setCategories(c)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Initial data load from the API on mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshAll()
  }, [refreshAll])

  const getBook = useCallback(
    (id: string) => books.find((b) => b.id === id),
    [books],
  )

  const refreshBook = useCallback<BookStore["refreshBook"]>(
    async (id) => {
      try {
        const book = await apiGetBook(id)
        upsertBook(book)
        return book
      } catch {
        return undefined
      }
    },
    [upsertBook],
  )

  const mergeCategories = useCallback((incoming: string[]) => {
    setCategories((prev) => {
      const lower = new Set(prev.map((c) => c.toLowerCase()))
      const add = incoming.filter((c) => !lower.has(c.toLowerCase()))
      return add.length ? [...prev, ...add] : prev
    })
  }, [])

  const addBook = useCallback<BookStore["addBook"]>(
    async ({ files, ...input }) => {
      const book = await apiCreateBook(input, files)
      upsertBook(book)
      mergeCategories(book.categories)
      return book.id
    },
    [upsertBook, mergeCategories],
  )

  const updateBook = useCallback<BookStore["updateBook"]>(
    async (id, patch) => {
      const book = await apiUpdateBook(id, patch)
      upsertBook(book)
      mergeCategories(book.categories)
    },
    [upsertBook, mergeCategories],
  )

  const addFiles = useCallback<BookStore["addFiles"]>(
    async (bookId, files) => {
      upsertBook(await apiAddFiles(bookId, files))
    },
    [upsertBook],
  )

  const deleteBook = useCallback<BookStore["deleteBook"]>(async (id) => {
    await apiDeleteBook(id)
    setBooks((prev) => prev.filter((b) => b.id !== id))
  }, [])

  const deleteFiles = useCallback<BookStore["deleteFiles"]>(
    async (bookId, fileIds) => {
      upsertBook(await apiDeleteFiles(bookId, { fileIds }))
    },
    [upsertBook],
  )

  const deleteFolder = useCallback<BookStore["deleteFolder"]>(
    async (bookId, section, folder) => {
      upsertBook(await apiDeleteFiles(bookId, { section, folder }))
    },
    [upsertBook],
  )

  const deleteSection = useCallback<BookStore["deleteSection"]>(
    async (bookId, section) => {
      upsertBook(await apiDeleteFiles(bookId, { section }))
    },
    [upsertBook],
  )

  const value = useMemo<BookStore>(
    () => ({
      books,
      categories,
      loading,
      error,
      refreshAll,
      getBook,
      refreshBook,
      addBook,
      updateBook,
      addFiles,
      deleteBook,
      deleteFiles,
      deleteFolder,
      deleteSection,
    }),
    [
      books,
      categories,
      loading,
      error,
      refreshAll,
      getBook,
      refreshBook,
      addBook,
      updateBook,
      addFiles,
      deleteBook,
      deleteFiles,
      deleteFolder,
      deleteSection,
    ],
  )

  return (
    <BookStoreContext.Provider value={value}>
      {children}
    </BookStoreContext.Provider>
  )
}

export function useBookStore() {
  const ctx = useContext(BookStoreContext)
  if (!ctx) {
    throw new Error("useBookStore must be used within a BookStoreProvider")
  }
  return ctx
}
