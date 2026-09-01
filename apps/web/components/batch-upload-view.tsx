"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ChevronRight,
  Circle,
  CircleAlert,
  CircleCheck,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"
import { useBookStore } from "@/components/book-store-provider"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { UnsavedChangesGuard } from "@/components/unsaved-changes-guard"
import { BusyOverlay } from "@/components/busy-overlay"
import { CategoryBadge } from "@/components/category-badge"
import {
  BookFields,
  draftIsValid,
  draftToSubmit,
  emptyDraft,
  type BookDraft,
} from "@/components/book-fields"
import { countPending } from "@/components/file-slots"

type Status = "idle" | "uploading" | "done" | "error"

interface Row {
  id: string
  draft: BookDraft
  status: Status
  error?: string
  bookId?: string
}

let seq = 0
function newRow(): Row {
  seq += 1
  return { id: `row_${seq}_${Date.now()}`, draft: emptyDraft(), status: "idle" }
}

function isBlank(d: BookDraft): boolean {
  return (
    !d.title.trim() &&
    !d.subtitle.trim() &&
    d.categories.length === 0 &&
    !d.pageLength.trim() &&
    countPending(d.pending) === 0
  )
}

function revokeDraft(d: BookDraft) {
  for (const list of Object.values(d.pending)) {
    for (const f of list) URL.revokeObjectURL(f.url)
  }
}

export function BatchUploadView() {
  const router = useRouter()
  const { addBook } = useBookStore()

  const [rows, setRows] = useState<Row[]>(() => [newRow()])
  const [expandedId, setExpandedId] = useState<string | null>(rows[0]?.id ?? null)
  const [showErrors, setShowErrors] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [batchIds, setBatchIds] = useState<string[]>([])

  const toCreate = useMemo(
    () => rows.filter((r) => r.status !== "done" && !isBlank(r.draft)),
    [rows],
  )
  const readyCount = toCreate.filter((r) =>
    draftIsValid(r.draft, { requireFiles: true }),
  ).length
  const doneCount = rows.filter((r) => r.status === "done").length
  const failedCount = rows.filter((r) => r.status === "error").length
  const allDone = rows.length > 0 && rows.every((r) => r.status === "done")
  const dirty =
    !running &&
    rows.some((r) => r.status !== "done" && !isBlank(r.draft))

  function patchRow(id: string, patch: Partial<Row>) {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    )
  }

  function updateDraft(id: string, draft: BookDraft) {
    setRows((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              draft,
              status: r.status === "error" ? "idle" : r.status,
              error: undefined,
            }
          : r,
      ),
    )
  }

  function addRow() {
    const row = newRow()
    setRows((prev) => [...prev, row])
    setExpandedId(row.id)
    setShowErrors(false)
  }

  function removeRow(id: string) {
    setRows((prev) => {
      const row = prev.find((r) => r.id === id)
      if (row) revokeDraft(row.draft)
      const next = prev.filter((r) => r.id !== id)
      return next.length ? next : [newRow()]
    })
  }

  function startSubmit() {
    if (toCreate.length === 0) {
      toast.error("Add at least one book to upload.")
      return
    }
    const firstInvalid = toCreate.find(
      (r) => !draftIsValid(r.draft, { requireFiles: true }),
    )
    if (firstInvalid) {
      setShowErrors(true)
      setExpandedId(firstInvalid.id)
      toast.error("Some books are incomplete.")
      return
    }
    setConfirmOpen(true)
  }

  async function runBatch() {
    const targets = rows.filter(
      (r) => r.status !== "done" && !isBlank(r.draft),
    )
    setBatchIds(targets.map((t) => t.id))
    setProgress({ done: 0, total: targets.length })
    setRunning(true)

    let ok = 0
    let cursor = 0
    async function worker() {
      while (cursor < targets.length) {
        const row = targets[cursor++]
        if (!row) break
        patchRow(row.id, { status: "uploading", error: undefined })
        try {
          const { data, files } = draftToSubmit(row.draft)
          const bookId = await addBook({ ...data, files })
          patchRow(row.id, { status: "done", bookId })
          ok += 1
        } catch (err) {
          patchRow(row.id, {
            status: "error",
            error: err instanceof Error ? err.message : "Upload failed",
          })
        }
        setProgress((p) => ({ ...p, done: p.done + 1 }))
      }
    }
    // upload up to 2 books at a time
    await Promise.all(
      Array.from({ length: Math.min(2, targets.length) }, worker),
    )
    setRunning(false)

    if (ok === targets.length) {
      toast.success(
        `${ok} book${ok === 1 ? "" : "s"} created`,
      )
      if (ok > 0) router.push("/")
    } else {
      toast.error(
        `${ok} created, ${targets.length - ok} failed — fix and retry`,
      )
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <UnsavedChangesGuard
        when={dirty}
        message="You have books that haven't been uploaded yet. If you leave now, they'll be lost."
      />
      <BusyOverlay show={running}>
        <BatchProgressPanel
          rows={rows.filter((r) => batchIds.includes(r.id))}
          done={progress.done}
          total={progress.total}
        />
      </BusyOverlay>

      <ul className="flex flex-col gap-3">
        {rows.map((row, i) => {
          const expanded = expandedId === row.id
          const valid = draftIsValid(row.draft, { requireFiles: true })
          const files = countPending(row.draft.pending)
          return (
            <li
              key={row.id}
              className={cn(
                "overflow-hidden rounded-xl border bg-card",
                row.status === "error"
                  ? "border-destructive/40"
                  : row.status === "done"
                    ? "border-emerald-500/40"
                    : "border-border",
              )}
            >
              <div className="flex items-center gap-2 p-3">
                <button
                  type="button"
                  onClick={() =>
                    setExpandedId((cur) => (cur === row.id ? null : row.id))
                  }
                  className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                  aria-expanded={expanded}
                >
                  <ChevronRight
                    className={cn(
                      "size-4 shrink-0 text-muted-foreground transition-transform",
                      expanded && "rotate-90",
                    )}
                  />
                  <span className="truncate font-medium">
                    {row.draft.title.trim() || `Untitled book ${i + 1}`}
                  </span>
                  <span className="hidden shrink-0 items-center gap-1 sm:flex">
                    {row.draft.categories.slice(0, 2).map((c) => (
                      <CategoryBadge key={c} category={c} />
                    ))}
                    {row.draft.categories.length > 2 ? (
                      <span className="text-xs text-muted-foreground">
                        +{row.draft.categories.length - 2}
                      </span>
                    ) : null}
                  </span>
                  <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                    {files} file{files === 1 ? "" : "s"}
                  </span>
                </button>

                <StatusPill row={row} valid={valid} />

                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  aria-label="Remove this book"
                  disabled={running}
                  onClick={() => removeRow(row.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>

              {expanded ? (
                <div className="border-t border-border p-4 sm:p-5">
                  {row.status === "error" && row.error ? (
                    <p className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                      {row.error}
                    </p>
                  ) : null}
                  <BookFields
                    value={row.draft}
                    onChange={(d) => updateDraft(row.id, d)}
                    showErrors={showErrors}
                    requireFiles
                  />
                </div>
              ) : null}
            </li>
          )
        })}
      </ul>

      <Button
        type="button"
        variant="outline"
        className="h-11 self-start"
        disabled={running}
        onClick={addRow}
      >
        <Plus className="size-4" />
        Add another book
      </Button>

      <div className="sticky bottom-0 -mx-4 mt-2 flex flex-wrap items-center justify-between gap-3 border-t border-border bg-background/90 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <span className="text-sm text-muted-foreground">
          {allDone ? (
            <span className="font-medium text-emerald-600 dark:text-emerald-400">
              All {doneCount} books created
            </span>
          ) : (
            <>
              {readyCount} of {toCreate.length} ready
              {doneCount > 0 ? ` · ${doneCount} created` : ""}
              {failedCount > 0 ? ` · ${failedCount} failed` : ""}
            </>
          )}
        </span>

        <div className="flex gap-2">
          {allDone ? (
            <Button
              type="button"
              className="h-11 px-5 text-base"
              onClick={() => router.push("/")}
            >
              Go to library
            </Button>
          ) : (
            <Button
              type="button"
              className="h-11 px-5 text-base"
              disabled={running || toCreate.length === 0}
              onClick={startSubmit}
            >
              {running ? (
                <Loader2 className="size-4 animate-spin" />
              ) : null}
              {running
                ? "Creating…"
                : failedCount > 0
                  ? `Retry ${toCreate.length} book${toCreate.length === 1 ? "" : "s"}`
                  : `Create ${toCreate.length} book${toCreate.length === 1 ? "" : "s"}`}
            </Button>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Create ${toCreate.length} book${toCreate.length === 1 ? "" : "s"}?`}
        description="Each book and its files will be uploaded to Google Drive and saved. This can take a moment."
        confirmLabel="Create"
        onConfirm={() => {
          void runBatch()
        }}
      />
    </div>
  )
}

function StatusPill({ row, valid }: { row: Row; valid: boolean }) {
  if (row.status === "uploading") {
    return (
      <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
        <Loader2 className="size-3.5 animate-spin" />
        <span className="hidden sm:inline">Uploading…</span>
      </span>
    )
  }
  if (row.status === "done") {
    return (
      <Link
        href={row.bookId ? `/books/${row.bookId}` : "#"}
        className="flex shrink-0 items-center gap-1 text-xs font-medium text-emerald-600 hover:underline dark:text-emerald-400"
      >
        <CircleCheck className="size-3.5" />
        <span className="hidden sm:inline">Created</span>
      </Link>
    )
  }
  if (row.status === "error") {
    return (
      <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-destructive">
        <CircleAlert className="size-3.5" />
        <span className="hidden sm:inline">Failed</span>
      </span>
    )
  }
  return (
    <span
      className={cn(
        "flex shrink-0 items-center gap-1 text-xs",
        valid
          ? "text-emerald-600 dark:text-emerald-400"
          : "text-amber-600 dark:text-amber-400",
      )}
    >
      {valid ? (
        <CircleCheck className="size-3.5" />
      ) : (
        <CircleAlert className="size-3.5" />
      )}
      <span className="hidden sm:inline">
        {valid ? "Ready" : "Incomplete"}
      </span>
    </span>
  )
}

const STEP_LABEL: Record<Status, string> = {
  idle: "Waiting",
  uploading: "Uploading…",
  done: "Created",
  error: "Failed",
}

function StepIcon({ status }: { status: Status }) {
  if (status === "uploading")
    return <Loader2 className="size-4 shrink-0 animate-spin text-primary" />
  if (status === "done")
    return <CircleCheck className="size-4 shrink-0 text-emerald-500" />
  if (status === "error")
    return <CircleAlert className="size-4 shrink-0 text-destructive" />
  return <Circle className="size-4 shrink-0 text-muted-foreground/40" />
}

function BatchProgressPanel({
  rows,
  done,
  total,
}: {
  rows: Row[]
  done: number
  total: number
}) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0
  return (
    <div className="flex w-[min(30rem,calc(100vw-2rem))] flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-lg">
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-semibold">
          Creating {total} book{total === 1 ? "" : "s"}
        </h2>
        <p className="text-xs text-muted-foreground">
          Uploading files to Google Drive — {done} of {total} done. Please keep
          this tab open.
        </p>
      </div>

      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>

      <ul className="flex max-h-[45vh] flex-col gap-0.5 overflow-y-auto">
        {rows.map((r, i) => (
          <li
            key={r.id}
            className={cn(
              "flex flex-col gap-0.5 rounded-lg px-2 py-2",
              r.status === "uploading" && "bg-primary/5",
            )}
          >
            <div className="flex items-center gap-2.5 text-sm">
              <StepIcon status={r.status} />
              <span className="min-w-0 flex-1 truncate">
                {r.draft.title.trim() || `Untitled book ${i + 1}`}
              </span>
              <span
                className={cn(
                  "shrink-0 text-xs",
                  r.status === "error"
                    ? "text-destructive"
                    : r.status === "done"
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-muted-foreground",
                )}
              >
                {STEP_LABEL[r.status]}
              </span>
            </div>
            {r.status === "error" && r.error ? (
              <p className="pl-[26px] text-xs text-destructive">{r.error}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  )
}
