"use client"

import { useId } from "react"
import { FileText, ImageIcon, Upload, X } from "lucide-react"
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
  onAdd: (files: FileList) => void
  onRemove: (id: string) => void
}) {
  const inputId = useId()
  const [section, folder] = slot.split(":") as [SectionType, FolderType]

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3">
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
        className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed border-border py-4 text-center text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
      >
        <Upload className="size-4" />
        <span>Add images or PDF</span>
        <input
          id={inputId}
          type="file"
          multiple
          accept="image/*,application/pdf"
          className="sr-only"
          onChange={(e) => {
            if (e.target.files?.length) onAdd(e.target.files)
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
  function addTo(slot: SlotKey, list: FileList) {
    const added = Array.from(list).map(fileToPending)
    onChange({ ...value, [slot]: [...value[slot], ...added] })
  }
  function removeFrom(slot: SlotKey, id: string) {
    const target = value[slot].find((f) => f.id === id)
    if (target) URL.revokeObjectURL(target.url)
    onChange({ ...value, [slot]: value[slot].filter((f) => f.id !== id) })
  }

  return (
    <div className="flex flex-col gap-4">
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
                  onAdd={(list) => addTo(slot, list)}
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
