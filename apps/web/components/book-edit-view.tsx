"use client"

import { useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Loader2, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { useBookStore } from "@/components/book-store-provider"
import { BookForm } from "@/components/book-form"
import { ButtonLink } from "@/components/button-link"
import { CategoryBadges } from "@/components/category-badge"
import { StatusBadges } from "@/components/status-badge"

export function BookEditView({ bookId }: { bookId: string }) {
  const router = useRouter()
  const { getBook, refreshBook, updateBook, addFiles, loading } = useBookStore()
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
            Edit “{book.title}”
          </h1>
          <StatusBadges book={book} className="mt-1" />
        </div>
        <ButtonLink
          href={`/books/${book.id}/delete`}
          variant="outline"
          size="sm"
        >
          <Trash2 className="size-4" />
          Delete files &amp; book
        </ButtonLink>
      </div>

      <section className="mt-6">
        <p className="mb-4 text-sm text-muted-foreground">
          Update the details or add more files below — changes are confirmed
          before saving. To remove files or delete the book, use{" "}
          <span className="font-medium">Delete files &amp; book</span>.
        </p>
        <div>
          <BookForm
            mode="edit"
            initial={{
              title: book.title,
              subtitle: book.subtitle,
              categories: book.categories,
              pageLength: book.pageLength,
            }}
            existingFileCount={book.files.length}
            submitLabel="Save changes"
            confirmTitle="Save changes to this book?"
            confirmDescription="Book details will be updated and any new files uploaded to Google Drive."
            onSubmit={async (data, files) => {
              try {
                await updateBook(book.id, data)
                if (files.length > 0) await addFiles(book.id, files)
                toast.success("Changes saved", {
                  description:
                    files.length > 0
                      ? `Updated details and added ${files.length} file${files.length === 1 ? "" : "s"}.`
                      : "Book details updated.",
                })
                router.push(`/books/${book.id}`)
              } catch (err) {
                toast.error("Could not save changes", {
                  description:
                    err instanceof Error ? err.message : "Please try again.",
                })
              }
            }}
          />
        </div>
      </section>
    </div>
  )
}
