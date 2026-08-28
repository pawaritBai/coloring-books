"use client"

import { useCallback, useEffect } from "react"
import { Dialog } from "@base-ui/react/dialog"
import { ChevronLeft, ChevronRight, ExternalLink, X } from "lucide-react"
import type { BookFile } from "@/lib/types"
import { cn } from "@workspace/ui/lib/utils"

export function FileLightbox({
  files,
  index,
  onIndexChange,
  onClose,
}: {
  files: BookFile[]
  index: number | null
  onIndexChange: (index: number) => void
  onClose: () => void
}) {
  const open = index !== null
  const current = open ? files[index] : undefined

  const go = useCallback(
    (delta: number) => {
      if (index === null || files.length === 0) return
      onIndexChange((index + delta + files.length) % files.length)
    },
    [index, files.length, onIndexChange],
  )

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") go(-1)
      if (e.key === "ArrowRight") go(1)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, go])

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/80 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <Dialog.Popup className="fixed inset-0 z-50 flex flex-col outline-none">
          <Dialog.Title className="sr-only">
            {current?.name ?? "File preview"}
          </Dialog.Title>
          <div className="flex items-center justify-between gap-4 px-4 py-3 text-sm text-white/90">
            <span className="truncate font-medium">{current?.name}</span>
            <div className="flex items-center gap-1">
              <span className="mr-2 text-xs text-white/60">
                {index !== null ? index + 1 : 0} / {files.length}
              </span>
              {current ? (
                <a
                  href={current.url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-md p-1.5 hover:bg-white/10"
                  aria-label="Open in new tab"
                >
                  <ExternalLink className="size-4" />
                </a>
              ) : null}
              <Dialog.Close
                className="rounded-md p-1.5 hover:bg-white/10"
                aria-label="Close"
              >
                <X className="size-5" />
              </Dialog.Close>
            </div>
          </div>

          <div className="relative flex flex-1 items-center justify-center overflow-hidden p-4">
            {files.length > 1 ? (
              <button
                type="button"
                onClick={() => go(-1)}
                className="absolute left-3 z-10 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
                aria-label="Previous file"
              >
                <ChevronLeft className="size-6" />
              </button>
            ) : null}

            {current ? (
              current.kind === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={current.url}
                  alt={current.name}
                  className="max-h-full max-w-full object-contain"
                />
              ) : (
                <iframe
                  title={current.name}
                  src={current.url}
                  className="h-full w-full max-w-4xl rounded-lg bg-white"
                />
              )
            ) : null}

            {files.length > 1 ? (
              <button
                type="button"
                onClick={() => go(1)}
                className={cn(
                  "absolute right-3 z-10 rounded-full bg-white/10 p-2 text-white hover:bg-white/20",
                )}
                aria-label="Next file"
              >
                <ChevronRight className="size-6" />
              </button>
            ) : null}
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
