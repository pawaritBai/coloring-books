import Link from "next/link"
import { FileText, ImageIcon } from "lucide-react"
import { CategoryBadge } from "@/components/category-badge"
import { FinishBadge, ExtraBadge } from "@/components/status-badge"
import { filesIn, type Book } from "@/lib/types"

export function BookCard({ book }: { book: Book }) {
  const coverImage =
    filesIn(book, "cover").find((f) => f.kind === "image") ?? null
  const coverPdf = filesIn(book, "cover").find((f) => f.kind === "pdf") ?? null
  const interiorCount = filesIn(book, "interior").length
  const primaryCategory = book.categories[0]

  return (
    <Link
      href={`/books/${book.id}`}
      className="group flex flex-col overflow-hidden rounded-lg border border-border bg-card transition-colors hover:border-primary/40"
    >
      <div className="relative aspect-[3/4] overflow-hidden bg-muted">
        {coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverImage.url}
            alt={`Cover of ${book.title}`}
            className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : coverPdf ? (
          <div className="flex size-full flex-col items-center justify-center gap-2 text-muted-foreground">
            <FileText className="size-8" />
            <span className="text-xs">Cover PDF</span>
          </div>
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-2 text-muted-foreground">
            <ImageIcon className="size-8" />
            <span className="text-xs">No cover</span>
          </div>
        )}
        {primaryCategory ? (
          <div className="absolute left-2 top-2 flex flex-wrap gap-1">
            <CategoryBadge
              category={primaryCategory}
              className="backdrop-blur"
            />
            {book.categories.length > 1 ? (
              <span className="rounded-full border border-border bg-card/80 px-1.5 py-0.5 text-xs font-medium text-muted-foreground backdrop-blur">
                +{book.categories.length - 1}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-1 p-3">
        <h3 className="font-display font-medium leading-tight text-pretty">
          {book.title}
        </h3>
        {book.subtitle ? (
          <p className="line-clamp-1 text-xs text-muted-foreground">
            {book.subtitle}
          </p>
        ) : null}
        <p className="text-xs text-muted-foreground">{book.id}</p>

        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <FinishBadge book={book} />
          <ExtraBadge book={book} />
        </div>

        <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <ImageIcon className="size-3.5" />
            {book.files.length} files
          </span>
          <span className="inline-flex items-center gap-1">
            <FileText className="size-3.5" />
            {interiorCount} interior
          </span>
        </div>
      </div>
    </Link>
  )
}
