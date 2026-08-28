"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  ChevronRight,
  FileText,
  Folder,
  FolderOpen,
  ImageIcon,
  Loader2,
  Pencil,
  Trash2,
} from "lucide-react"
import { useBookStore } from "@/components/book-store-provider"
import { CategoryBadges } from "@/components/category-badge"
import { StatusBadges } from "@/components/status-badge"
import { FileLightbox } from "@/components/file-lightbox"
import { ButtonLink } from "@/components/button-link"
import {
  FOLDERS,
  FOLDER_LABELS,
  SECTIONS,
  SECTION_LABELS,
  filesIn,
  type BookFile,
  type FolderType,
  type SectionType,
} from "@/lib/types"
import { cn } from "@workspace/ui/lib/utils"

type SlotKey = `${SectionType}:${FolderType}`

function formatDate(ms: number) {
  return new Date(ms).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function FileGrid({
  files,
  onOpen,
}: {
  files: BookFile[]
  onOpen: (index: number) => void
}) {
  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border py-20 text-center text-sm text-muted-foreground">
        <ImageIcon className="size-7" />
        This folder is empty.
      </div>
    )
  }
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(180px,1fr))]">
      {files.map((f, i) => (
        <button
          key={f.id}
          type="button"
          onClick={() => onOpen(i)}
          className="group flex flex-col overflow-hidden rounded-lg border border-border bg-card text-left transition-colors hover:border-primary/40"
        >
          <div className="relative aspect-[3/4] overflow-hidden bg-muted">
            {f.kind === "image" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={f.url}
                alt={f.name}
                className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              />
            ) : (
              <span className="flex size-full flex-col items-center justify-center gap-1 text-muted-foreground">
                <FileText className="size-8" />
                <span className="text-xs">PDF</span>
              </span>
            )}
          </div>
          <span className="truncate px-2.5 py-2 text-xs" title={f.name}>
            {f.name}
          </span>
        </button>
      ))}
    </div>
  )
}

export function BookDetailView({ bookId }: { bookId: string }) {
  const { getBook, refreshBook, loading } = useBookStore()
  const book = getBook(bookId)

  const [active, setActive] = useState<SlotKey>("cover:final")
  const [lightboxFiles, setLightboxFiles] = useState<BookFile[]>([])
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  useEffect(() => {
    void refreshBook(bookId)
  }, [bookId, refreshBook])

  const [activeSection, activeFolder] = active.split(":") as [
    SectionType,
    FolderType,
  ]

  const activeFiles = useMemo(
    () => (book ? filesIn(book, activeSection, activeFolder) : []),
    [book, activeSection, activeFolder],
  )

  if (!book) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
        {loading ? (
          <Loader2 className="mx-auto size-6 animate-spin text-muted-foreground" />
        ) : (
          <>
            <p className="font-medium">Book not found</p>
            <p className="mt-1 text-sm text-muted-foreground">
              It may have been deleted.
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
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to library
      </Link>

      <div className="mt-4 flex flex-col gap-4 rounded-xl border border-border bg-card p-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <CategoryBadges categories={book.categories} />
            <span className="text-xs text-muted-foreground">{book.id}</span>
          </div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            {book.title}
          </h1>
          {book.subtitle ? (
            <p className="text-sm text-muted-foreground">{book.subtitle}</p>
          ) : null}
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {book.pageLength != null ? (
              <span>{book.pageLength} pages</span>
            ) : null}
            <span>{book.files.length} files</span>
            <span>Created {formatDate(book.createdAt)}</span>
            <span>Updated {formatDate(book.updatedAt)}</span>
          </div>
          <StatusBadges book={book} className="mt-2" />
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          <ButtonLink href={`/books/${book.id}/edit`} size="sm">
            <Pencil className="size-4" />
            Edit &amp; add files
          </ButtonLink>
          <ButtonLink
            href={`/books/${book.id}/delete`}
            variant="destructive"
            size="sm"
          >
            <Trash2 className="size-4" />
            Delete
          </ButtonLink>
        </div>
      </div>

      {/* Folder explorer: left rail picks one folder, right pane shows it */}
      <div className="mt-6 grid gap-4 lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-6">
        <nav
          aria-label="Book folders"
          className="rounded-xl border border-border bg-card p-2"
        >
          {SECTIONS.map((section) => (
            <div key={section} className="mb-1 last:mb-0">
              <div className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {SECTION_LABELS[section]}
                <span className="ml-1.5 font-normal normal-case">
                  · {filesIn(book, section).length} file
                  {filesIn(book, section).length === 1 ? "" : "s"}
                </span>
              </div>
              <ul>
                {FOLDERS.map((folder) => {
                  const slot: SlotKey = `${section}:${folder}`
                  const count = filesIn(book, section, folder).length
                  const isActive = slot === active
                  return (
                    <li key={folder}>
                      <button
                        type="button"
                        onClick={() => setActive(slot)}
                        aria-current={isActive ? "true" : undefined}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm transition-colors",
                          isActive
                            ? "bg-primary/10 font-medium text-foreground"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground",
                        )}
                      >
                        {isActive ? (
                          <FolderOpen className="size-4 shrink-0 text-primary" />
                        ) : (
                          <Folder className="size-4 shrink-0" />
                        )}
                        <span className="flex-1 text-left">
                          {FOLDER_LABELS[folder]}
                        </span>
                        <span
                          className={cn(
                            "rounded-full px-1.5 text-xs",
                            count === 0
                              ? "text-muted-foreground/60"
                              : isActive
                                ? "bg-primary/15 text-foreground"
                                : "bg-muted text-muted-foreground",
                          )}
                        >
                          {count}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </nav>

        <section className="min-w-0">
          <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-border pb-3">
            <span className="inline-flex items-center gap-1.5 text-sm font-medium">
              <span className="text-muted-foreground">
                {SECTION_LABELS[activeSection]}
              </span>
              <ChevronRight className="size-4 text-muted-foreground" />
              {FOLDER_LABELS[activeFolder]}
            </span>
            <span className="text-xs text-muted-foreground">
              {activeFiles.length} file{activeFiles.length === 1 ? "" : "s"}
            </span>
          </div>

          <FileGrid
            files={activeFiles}
            onOpen={(i) => {
              setLightboxFiles(activeFiles)
              setLightboxIndex(i)
            }}
          />
        </section>
      </div>

      <FileLightbox
        files={lightboxFiles}
        index={lightboxIndex}
        onIndexChange={setLightboxIndex}
        onClose={() => setLightboxIndex(null)}
      />
    </div>
  )
}
