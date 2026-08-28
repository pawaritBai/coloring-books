"use client"

import { useEffect } from "react"
import Link from "next/link"
import { ArrowLeft, Loader2, Pencil } from "lucide-react"
import { useBookStore } from "@/components/book-store-provider"
import { BookManagePanel } from "@/components/book-manage-panel"
import { ButtonLink } from "@/components/button-link"
import { CategoryBadges } from "@/components/category-badge"
import { StatusBadges } from "@/components/status-badge"

export function BookDeleteView({ bookId }: { bookId: string }) {
  const { getBook, refreshBook, loading } = useBookStore()
  const book = getBook(bookId)

  useEffect(() => {
    void refreshBook(bookId)
  }, [bookId, refreshBook])

  if (!book) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
        {loading ? (
          <Loader2 className="mx-auto size-6 animate-spin text-muted-foreground" />
        ) : (
          <>
            <p className="font-medium">Book not found</p>
            <p className="mt-1 text-sm text-muted-foreground">
              It may have already been deleted.
            </p>
            <Link
              href="/"
              className="mt-4 inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              <ArrowLeft className="size-4" />
              Back to library
            </Link>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="w-full px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href={`/books/${book.id}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to book
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <CategoryBadges categories={book.categories} />
            <span className="text-xs text-muted-foreground">{book.id}</span>
          </div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            Delete from “{book.title}”
          </h1>
          <StatusBadges book={book} className="mt-1" />
        </div>
        <ButtonLink
          href={`/books/${book.id}/edit`}
          variant="outline"
          size="sm"
        >
          <Pencil className="size-4" />
          Edit details &amp; add files
        </ButtonLink>
      </div>

      <p className="mt-4 text-sm text-muted-foreground">
        This page only removes things. To change the book&rsquo;s details or add
        files, use <span className="font-medium">Edit details &amp; add files</span>.
      </p>

      <section className="mt-6">
        <BookManagePanel book={book} />
      </section>
    </div>
  )
}
