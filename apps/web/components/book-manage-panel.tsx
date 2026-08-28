"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { FileText, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { useBookStore } from "@/components/book-store-provider"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { Button } from "@workspace/ui/components/button"
import {
  FOLDERS,
  FOLDER_LABELS,
  SECTIONS,
  SECTION_LABELS,
  filesIn,
  type Book,
  type FolderType,
  type SectionType,
} from "@/lib/types"
import { cn } from "@workspace/ui/lib/utils"

type PendingAction =
  | { kind: "book" }
  | { kind: "section"; section: SectionType }
  | { kind: "folder"; section: SectionType; folder: FolderType }
  | { kind: "files"; ids: string[] }

export function BookManagePanel({ book }: { book: Book }) {
  const router = useRouter()
  const { deleteBook, deleteSection, deleteFolder, deleteFiles } = useBookStore()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [pending, setPending] = useState<PendingAction | null>(null)

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function describe(action: PendingAction): {
    title: string
    description: string
    confirmLabel: string
  } {
    switch (action.kind) {
      case "book":
        return {
          title: `Delete “${book.title}”?`,
          description:
            "The book and all of its Cover and Interior files will be permanently removed.",
          confirmLabel: "Delete book",
        }
      case "section": {
        const n = filesIn(book, action.section).length
        return {
          title: `Delete all ${SECTION_LABELS[action.section]} files?`,
          description: `Both Final and Extra folders under ${SECTION_LABELS[action.section]} will be removed (${n} file${n === 1 ? "" : "s"}).`,
          confirmLabel: "Delete section",
        }
      }
      case "folder": {
        const n = filesIn(book, action.section, action.folder).length
        return {
          title: `Delete ${SECTION_LABELS[action.section]} / ${FOLDER_LABELS[action.folder]}?`,
          description: `${n} file${n === 1 ? "" : "s"} in this folder will be removed.`,
          confirmLabel: "Delete folder",
        }
      }
      case "files":
        return {
          title: `Delete ${action.ids.length} selected file${action.ids.length === 1 ? "" : "s"}?`,
          description: "The selected files will be permanently removed.",
          confirmLabel: "Delete files",
        }
    }
  }

  async function run(action: PendingAction) {
    try {
      switch (action.kind) {
        case "book":
          await deleteBook(book.id)
          toast.success("Book deleted", {
            description: `“${book.title}” and its Drive files were removed.`,
          })
          router.push("/")
          return
        case "section":
          await deleteSection(book.id, action.section)
          setSelected(new Set())
          toast.success(`${SECTION_LABELS[action.section]} deleted`)
          return
        case "folder":
          await deleteFolder(book.id, action.section, action.folder)
          setSelected(new Set())
          toast.success(
            `${SECTION_LABELS[action.section]} / ${FOLDER_LABELS[action.folder]} deleted`,
          )
          return
        case "files":
          await deleteFiles(book.id, action.ids)
          setSelected(new Set())
          toast.success(
            `${action.ids.length} file${action.ids.length === 1 ? "" : "s"} deleted`,
          )
          return
      }
    } catch (err) {
      toast.error("Delete failed", {
        description: err instanceof Error ? err.message : "Please try again.",
      })
    }
  }

  const meta = pending ? describe(pending) : null

  return (
    <div className="flex flex-col gap-5 rounded-xl border border-destructive/30 bg-destructive/5 p-5">
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-semibold">Delete files & book</h2>
        <p className="text-sm text-muted-foreground">
          Every delete asks for confirmation first. Deleting a section removes
          both its Final and Extra folders.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {SECTIONS.map((section) => {
          const sectionCount = filesIn(book, section).length
          return (
            <div
              key={section}
              className="rounded-lg border border-border bg-card p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-medium">
                  {SECTION_LABELS[section]}{" "}
                  <span className="text-muted-foreground">
                    ({sectionCount} file{sectionCount === 1 ? "" : "s"})
                  </span>
                </span>
                <div className="flex flex-wrap gap-2">
                  {FOLDERS.map((folder) => {
                    const n = filesIn(book, section, folder).length
                    return (
                      <Button
                        key={folder}
                        type="button"
                        size="xs"
                        variant="outline"
                        disabled={n === 0}
                        onClick={() =>
                          setPending({ kind: "folder", section, folder })
                        }
                      >
                        <Trash2 className="size-3.5" />
                        {FOLDER_LABELS[folder]} ({n})
                      </Button>
                    )
                  })}
                  <Button
                    type="button"
                    size="xs"
                    variant="destructive"
                    disabled={sectionCount === 0}
                    onClick={() => setPending({ kind: "section", section })}
                  >
                    <Trash2 className="size-3.5" />
                    All {SECTION_LABELS[section]}
                  </Button>
                </div>
              </div>

              <div className="mt-3 flex flex-col gap-3">
                {FOLDERS.map((folder) => {
                  const files = filesIn(book, section, folder)
                  if (files.length === 0) return null
                  return (
                    <div key={folder} className="flex flex-col gap-1.5">
                      <span className="text-xs font-medium text-muted-foreground">
                        {FOLDER_LABELS[folder]}
                      </span>
                      <ul className="flex flex-wrap gap-2">
                        {files.map((f) => {
                          const isSel = selected.has(f.id)
                          return (
                            <li key={f.id}>
                              <button
                                type="button"
                                onClick={() => toggle(f.id)}
                                aria-pressed={isSel}
                                className={cn(
                                  "flex items-center gap-2 rounded-md border px-2 py-1.5 text-xs transition-colors",
                                  isSel
                                    ? "border-destructive bg-destructive/10 text-destructive"
                                    : "border-border bg-background hover:border-destructive/40",
                                )}
                                title={f.name}
                              >
                                <span
                                  className={cn(
                                    "flex size-4 items-center justify-center rounded border",
                                    isSel
                                      ? "border-destructive bg-destructive text-white"
                                      : "border-muted-foreground/40",
                                  )}
                                >
                                  {isSel ? "✓" : ""}
                                </span>
                                {f.kind === "pdf" ? (
                                  <FileText className="size-3.5" />
                                ) : (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={f.url}
                                    alt=""
                                    className="size-5 rounded object-cover"
                                  />
                                )}
                                <span className="max-w-[10rem] truncate">
                                  {f.name}
                                </span>
                              </button>
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={selected.size === 0}
          onClick={() =>
            setPending({ kind: "files", ids: Array.from(selected) })
          }
        >
          <Trash2 className="size-4" />
          Delete selected ({selected.size})
        </Button>

        <Button
          type="button"
          variant="destructive"
          size="sm"
          onClick={() => setPending({ kind: "book" })}
        >
          <Trash2 className="size-4" />
          Delete this book
        </Button>
      </div>

      {meta ? (
        <ConfirmDialog
          open={pending !== null}
          onOpenChange={(o) => !o && setPending(null)}
          title={meta.title}
          description={meta.description}
          confirmLabel={meta.confirmLabel}
          cancelLabel="Cancel"
          destructive
          onConfirm={() => {
            if (pending) void run(pending)
            setPending(null)
          }}
        />
      ) : null}
    </div>
  )
}
