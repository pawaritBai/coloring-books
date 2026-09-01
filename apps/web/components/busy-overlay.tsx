"use client"

import { useEffect, type ReactNode } from "react"
import { Loader2 } from "lucide-react"

/**
 * Full-screen blocking overlay shown while a request is in flight. Being a
 * top-most fixed element, it intercepts every click / tap underneath it, so
 * nothing else on the page can be interacted with until it goes away.
 *
 * Pass `children` for a custom panel; otherwise a spinner + label is shown.
 */
export function BusyOverlay({
  show,
  label,
  hint = "Please keep this tab open.",
  children,
}: {
  show: boolean
  label?: string
  hint?: string
  children?: ReactNode
}) {
  useEffect(() => {
    if (!show) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ""
    }
    window.addEventListener("beforeunload", onBeforeUnload)
    return () => window.removeEventListener("beforeunload", onBeforeUnload)
  }, [show])

  if (!show) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
      role="alertdialog"
      aria-modal="true"
      aria-busy="true"
      aria-label={label ?? "Working"}
      onContextMenu={(e) => e.preventDefault()}
    >
      {children ?? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card px-6 py-5 text-center shadow-lg">
          <Loader2 className="size-6 animate-spin text-primary" />
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-muted-foreground">{hint}</p>
        </div>
      )}
    </div>
  )
}
