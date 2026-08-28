"use client"

import { useMemo, useState, type FormEvent } from "react"
import { Loader2 } from "lucide-react"
import { Input } from "@workspace/ui/components/input"
import { Button } from "@workspace/ui/components/button"
import { useBookStore } from "@/components/book-store-provider"
import type { BookInput } from "@/lib/types"
import type { UploadEntry } from "@/lib/api-client"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { CategoryEditor } from "@/components/category-editor"
import {
  FileSlots,
  countPending,
  emptyPendingFiles,
  pendingToEntries,
  type PendingFiles,
} from "@/components/file-slots"

export interface BookFormProps {
  mode: "create" | "edit"
  initial?: BookInput
  /** number of files the book already has (edit mode) */
  existingFileCount?: number
  submitLabel: string
  confirmTitle: string
  confirmDescription: string
  onSubmit: (data: BookInput, files: UploadEntry[]) => void | Promise<void>
}

function Label({ children }: { children: React.ReactNode }) {
  return <span className="text-sm font-medium">{children}</span>
}

function ErrorText({ children }: { children: React.ReactNode }) {
  return <span className="text-xs text-destructive">{children}</span>
}

function SectionHeader({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="flex flex-col gap-1 border-b border-border pb-4">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  )
}

/** Larger control styling shared by every field in the form. */
const fieldClass = "h-12 rounded-lg px-3.5 text-base"
const sectionClass =
  "flex h-full flex-col gap-4 rounded-xl border border-border bg-card p-5 sm:p-6"

export function BookForm({
  mode,
  initial,
  existingFileCount = 0,
  submitLabel,
  confirmTitle,
  confirmDescription,
  onSubmit,
}: BookFormProps) {
  const { categories } = useBookStore()

  const [title, setTitle] = useState(initial?.title ?? "")
  const [subtitle, setSubtitle] = useState(initial?.subtitle ?? "")
  const [bookCategories, setBookCategories] = useState<string[]>(
    initial?.categories ?? [],
  )
  const [pageLength, setPageLength] = useState(
    initial?.pageLength != null ? String(initial.pageLength) : "",
  )
  const [pending, setPending] = useState<PendingFiles>(emptyPendingFiles)

  const [submitted, setSubmitted] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  const pendingCount = countPending(pending)
  const requiresFiles = mode === "create"

  const errors = useMemo(() => {
    const e: Record<string, string> = {}
    if (!title.trim()) e.title = "Title is required."
    if (bookCategories.length === 0)
      e.category = "At least one category is required."
    if (pageLength.trim()) {
      const n = Number(pageLength)
      if (!Number.isInteger(n) || n <= 0)
        e.pageLength = "Page length must be a positive whole number."
    }
    if (requiresFiles && pendingCount === 0)
      e.files = "Upload at least one file into any slot."
    return e
  }, [title, bookCategories, pageLength, requiresFiles, pendingCount])

  const hasErrors = Object.keys(errors).length > 0

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitted(true)
    if (hasErrors) return
    setConfirmOpen(true)
  }

  async function confirmed() {
    const data: BookInput = {
      title: title.trim(),
      subtitle: subtitle.trim() || undefined,
      categories: bookCategories,
      pageLength: pageLength.trim() ? Number(pageLength) : undefined,
    }
    setBusy(true)
    try {
      await onSubmit(data, pendingToEntries(pending))
    } finally {
      setBusy(false)
    }
  }

  const show = (key: string) => submitted && errors[key]

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6" noValidate>
      <div className="grid items-stretch gap-6 xl:grid-cols-2">
        {/* Section 1 — book details */}
        <section className={sectionClass}>
          <SectionHeader
            title="Book details"
            description="Title and category are required. Subtitle and page length are optional."
          />

          <label className="flex flex-col gap-1.5">
            <Label>
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="The Sleepy Little Fox"
              aria-invalid={show("title") ? true : undefined}
              className={fieldClass}
            />
            {show("title") ? <ErrorText>{errors.title}</ErrorText> : null}
          </label>

          <label className="flex flex-col gap-1.5">
            <Label>
              Subtitle <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="A bedtime coloring story"
              className={fieldClass}
            />
          </label>

          <div className="flex flex-col gap-1.5">
            <Label>
              Categories <span className="text-destructive">*</span>
            </Label>
            <CategoryEditor
              value={bookCategories}
              onChange={setBookCategories}
              options={categories}
              invalid={!!show("category")}
            />
            {show("category") ? (
              <ErrorText>{errors.category}</ErrorText>
            ) : (
              <span className="text-xs text-muted-foreground">
                A book can have several. New names are saved with the book.
              </span>
            )}
          </div>

          <label className="flex flex-col gap-1.5">
            <Label>
              Page length{" "}
              <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              type="number"
              min={1}
              step={1}
              value={pageLength}
              onChange={(e) => setPageLength(e.target.value)}
              placeholder="32"
              aria-invalid={show("pageLength") ? true : undefined}
              className={fieldClass}
            />
            {show("pageLength") ? (
              <ErrorText>{errors.pageLength}</ErrorText>
            ) : null}
          </label>
        </section>

        {/* Section 2 — files */}
        <section className={sectionClass}>
          <SectionHeader
            title="Files"
            description={
              mode === "create"
                ? "Upload at least one file into any Cover or Interior slot."
                : `Optional — new files are added to the ${existingFileCount} already stored.`
            }
          />
          <FileSlots
            value={pending}
            onChange={setPending}
            hint={
              pendingCount > 0
                ? `${pendingCount} file${pendingCount === 1 ? "" : "s"} ready to upload`
                : undefined
            }
          />
          {show("files") ? <ErrorText>{errors.files}</ErrorText> : null}
        </section>
      </div>

      <div className="flex items-center gap-3">
        <Button
          type="submit"
          disabled={busy}
          className="h-12 px-6 text-base"
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : null}
          {busy ? "Working…" : submitLabel}
        </Button>
        {submitted && hasErrors ? (
          <span className="text-sm text-destructive">
            Please fix the errors above.
          </span>
        ) : null}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={confirmTitle}
        description={confirmDescription}
        confirmLabel={submitLabel}
        onConfirm={() => {
          void confirmed()
        }}
      />
    </form>
  )
}
