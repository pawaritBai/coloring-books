"use client"

import { useMemo, useState, type FormEvent } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import type { BookInput } from "@/lib/types"
import type { UploadEntry } from "@/lib/api-client"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { UnsavedChangesGuard } from "@/components/unsaved-changes-guard"
import { BusyOverlay } from "@/components/busy-overlay"
import {
  BookFields,
  draftErrors,
  draftIsDirty,
  draftToSubmit,
  emptyDraft,
  type BookDraft,
} from "@/components/book-fields"

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

export function BookForm({
  mode,
  initial,
  existingFileCount = 0,
  submitLabel,
  confirmTitle,
  confirmDescription,
  onSubmit,
}: BookFormProps) {
  const [draft, setDraft] = useState<BookDraft>(() => emptyDraft(initial))
  const [submitted, setSubmitted] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  const requireFiles = mode === "create"
  const errors = useMemo(
    () => draftErrors(draft, { requireFiles }),
    [draft, requireFiles],
  )
  const hasErrors = Object.keys(errors).length > 0

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitted(true)
    if (hasErrors) return
    setConfirmOpen(true)
  }

  async function confirmed() {
    const { data, files } = draftToSubmit(draft)
    setBusy(true)
    try {
      await onSubmit(data, files)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6" noValidate>
      <UnsavedChangesGuard when={!busy && draftIsDirty(draft, initial)} />
      <BusyOverlay
        show={busy}
        label={mode === "create" ? "Creating book…" : "Saving changes…"}
        hint="Files are being sent to Google Drive. Please keep this tab open."
      />

      <BookFields
        value={draft}
        onChange={setDraft}
        showErrors={submitted}
        requireFiles={requireFiles}
        existingFileCount={existingFileCount}
      />

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={busy} className="h-12 px-6 text-base">
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
