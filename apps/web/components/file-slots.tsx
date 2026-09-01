"use client"

import { useId, useState } from "react"
import { FileText, ImageIcon, Upload, X } from "lucide-react"
import { toast } from "sonner"
import {
  FOLDER_LABELS,
  SECTION_LABELS,
  SECTIONS,
  FOLDERS,
  type FileKind,
  type FolderType,
  type SectionType,
} from "@/lib/types"
import type { UploadEntry } from "@/lib/api-client"
import { cn } from "@workspace/ui/lib/utils"

export type SlotKey = `${SectionType}:${FolderType}`

export interface PendingFile {
  id: string
  name: string
  url: string
  kind: FileKind
  size: number
  /** the real file, sent to the server on submit */
  file: File
}

export type PendingFiles = Record<SlotKey, PendingFile[]>

export function emptyPendingFiles(): PendingFiles {
  return {
    "cover:final": [],
    "cover:extra": [],
    "interior:final": [],
    "interior:extra": [],
  }
}

export function countPending(pending: PendingFiles): number {
  return Object.values(pending).reduce((n, list) => n + list.length, 0)
}

let uid = 0
function fileToPending(file: File): PendingFile {
  uid += 1
  return {
    id: `pending_${uid}_${Date.now()}`,
    name: file.name,
    url: URL.createObjectURL(file),
    kind: file.type === "application/pdf" ? "pdf" : "image",
    size: file.size,
    file,
  }
}

const ACCEPT_EXT = /\.(png|jpe?g|gif|webp|avif|svg|bmp|tiff?|heic|pdf)$/i
function isAccepted(file: File): boolean {
  return (
    file.type.startsWith("image/") ||
    file.type === "application/pdf" ||
    (file.type === "" && ACCEPT_EXT.test(file.name))
  )
}

export function pendingToEntries(pending: PendingFiles): UploadEntry[] {
  const out: UploadEntry[] = []
  for (const section of SECTIONS) {
    for (const folder of FOLDERS) {
      for (const p of pending[`${section}:${folder}`]) {
        out.push({ file: p.file, section, folder })
      }
    }
  }
  return out
}

function Slot({
  slot,
  files,
  onAdd,
  onRemove,
}: {
  slot: SlotKey
  files: PendingFile[]
  onAdd: (files: File[]) => void
  onRemove: (id: string) => void
}) {
  const inputId = useId()
  const [dragging, setDragging] = useState(false)
  const [section, folder] = slot.split(":") as [SectionType, FolderType]

  function accept(dropped: File[]) {
    const ok = dropped.filter(isAccepted)
    if (ok.length) onAdd(ok)
    const skipped = dropped.length - ok.length
    if (skipped > 0) {
      toast.info(
        `${skipped} file${skipped === 1 ? "" : "s"} skipped — only images and PDFs are allowed.`,
      )
    }
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-lg border bg-card p-3 transition-colors",
        dragging ? "border-primary ring-2 ring-primary/20" : "border-border",
      )}
      onDragEnter={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragOver={(e) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = "copy"
        if (!dragging) setDragging(true)
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setDragging(false)
        }
      }}
      onDrop={(e) => {
        e.preventDefault()
        setDragging(false)
        if (e.dataTransfer.files.length) accept(Array.from(e.dataTransfer.files))
      }}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">
          {SECTION_LABELS[section]}{" "}
          <span className="text-muted-foreground">
            / {FOLDER_LABELS[folder]}
          </span>
        </span>
        <span className="text-xs text-muted-foreground">{files.length}</span>
      </div>

      <label
        htmlFor={inputId}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed py-5 text-center text-xs transition-colors",
          dragging
            ? "border-primary bg-primary/5 text-foreground"
            : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
        )}
      >
        <Upload className="size-4" />
        <span>
          {dragging ? "Drop to add" : "Drag files here, or click to browse"}
        </span>
        <input
          id={inputId}
          type="file"
          multiple
          accept="image/*,application/pdf"
          className="sr-only"
          onChange={(e) => {
            if (e.target.files?.length) accept(Array.from(e.target.files))
            e.target.value = ""
          }}
        />
      </label>

      {files.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {files.map((f) => (
            <li
              key={f.id}
              className="group relative size-16 overflow-hidden rounded-md border border-border bg-muted"
              title={f.name}
            >
              {f.kind === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={f.url}
                  alt={f.name}
                  className="size-full object-cover"
                />
              ) : (
                <span className="flex size-full flex-col items-center justify-center gap-0.5 text-[10px] text-muted-foreground">
                  <FileText className="size-4" />
                  PDF
                </span>
              )}
              <button
                type="button"
                onClick={() => onRemove(f.id)}
                className="absolute right-0.5 top-0.5 rounded bg-background/90 p-0.5 text-foreground opacity-0 transition-opacity group-hover:opacity-100"
                aria-label={`Remove ${f.name}`}
              >
                <X className="size-3" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

export function FileSlots({
  value,
  onChange,
  hint,
}: {
  value: PendingFiles
  onChange: (next: PendingFiles) => void
  hint?: string
}) {
  function addTo(slot: SlotKey, files: File[]) {
    if (files.length === 0) return
    const added = files.map(fileToPending)
    onChange({ ...value, [slot]: [...value[slot], ...added] })
  }
  function removeFrom(slot: SlotKey, id: string) {
    const target = value[slot].find((f) => f.id === id)
    if (target) URL.revokeObjectURL(target.url)
    onChange({ ...value, [slot]: value[slot].filter((f) => f.id !== id) })
  }

  return (
    <div
      className="flex flex-col gap-4"
      // a drop that misses a slot shouldn't make the browser open the file
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => e.preventDefault()}
    >
      {SECTIONS.map((section) => (
        <div key={section} className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <ImageIcon className="size-4 text-muted-foreground" />
            <span className="text-sm font-semibold">
              {SECTION_LABELS[section]}
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {FOLDERS.map((folder) => {
              const slot: SlotKey = `${section}:${folder}`
              return (
                <Slot
                  key={slot}
                  slot={slot}
                  files={value[slot]}
                  onAdd={(files) => addTo(slot, files)}
                  onRemove={(id) => removeFrom(slot, id)}
                />
              )
            })}
          </div>
        </div>
      ))}
      {hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  )
}
