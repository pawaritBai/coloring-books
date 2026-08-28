"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { toast } from "sonner"
import { SiteHeader } from "@/components/site-header"
import { BookForm } from "@/components/book-form"
import { useBookStore } from "@/components/book-store-provider"

export default function UploadPage() {
  const router = useRouter()
  const { addBook } = useBookStore()

  return (
    <main className="min-h-svh">
      <SiteHeader showUpload={false} />
      <div className="w-full px-4 py-8 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to library
        </Link>

        <div className="mt-4 flex flex-col gap-1">
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            Upload a book
          </h1>
          <p className="text-sm text-muted-foreground">
            Title and category are required. Upload at least one file into any
            Cover or Interior slot.
          </p>
        </div>

        <div className="mt-6">
          <BookForm
            mode="create"
            submitLabel="Create book"
            confirmTitle="Create this book?"
            confirmDescription="The book and its files will be uploaded to Google Drive and saved."
            onSubmit={async (data, files) => {
              try {
                const id = await addBook({ ...data, files })
                toast.success("Book created", {
                  description: `“${data.title}” was added to ${data.categories.join(", ")}.`,
                })
                router.push(`/books/${id}`)
              } catch (err) {
                toast.error("Could not create the book", {
                  description:
                    err instanceof Error ? err.message : "Please try again.",
                })
              }
            }}
          />
        </div>
      </div>
    </main>
  )
}
