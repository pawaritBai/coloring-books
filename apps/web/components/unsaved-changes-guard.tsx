"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ConfirmDialog } from "@/components/confirm-dialog"

/**
 * Warns before leaving the page while `when` is true:
 *  - tab close / reload / typing a new URL  → the browser's native prompt
 *  - clicking an in-app link                → a confirm dialog
 *
 * The browser Back/Forward buttons are not intercepted (no reliable
 * cross-browser way without messing with history); reload + link clicks
 * cover the common cases.
 */
export function UnsavedChangesGuard({
  when,
  message = "You have unsaved book details. If you leave now, they'll be lost.",
}: {
  when: boolean
  message?: string
}) {
  const router = useRouter()
  const [pendingHref, setPendingHref] = useState<string | null>(null)

  useEffect(() => {
    if (!when) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ""
    }
    window.addEventListener("beforeunload", onBeforeUnload)
    return () => window.removeEventListener("beforeunload", onBeforeUnload)
  }, [when])

  useEffect(() => {
    if (!when) return

    const onClick = (e: MouseEvent) => {
      if (
        e.defaultPrevented ||
        e.button !== 0 ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey
      ) {
        return
      }
      const anchor = (e.target as HTMLElement | null)?.closest("a")
      if (!anchor) return

      const href = anchor.getAttribute("href")
      if (!href || href.startsWith("#")) return
      if (anchor.target && anchor.target !== "_self") return
      if (anchor.hasAttribute("download")) return

      let url: URL
      try {
        url = new URL(href, window.location.href)
      } catch {
        return
      }
      if (url.origin !== window.location.origin) return
      if (
        url.pathname === window.location.pathname &&
        url.search === window.location.search
      ) {
        return
      }

      e.preventDefault()
      e.stopPropagation()
      setPendingHref(url.pathname + url.search + url.hash)
    }

    document.addEventListener("click", onClick, true)
    return () => document.removeEventListener("click", onClick, true)
  }, [when])

  const leave = useCallback(() => {
    const href = pendingHref
    setPendingHref(null)
    if (href) router.push(href)
  }, [pendingHref, router])

  return (
    <ConfirmDialog
      open={pendingHref !== null}
      onOpenChange={(open) => {
        if (!open) setPendingHref(null)
      }}
      title="Leave this page?"
      description={message}
      confirmLabel="Leave"
      cancelLabel="Stay"
      destructive
      onConfirm={leave}
    />
  )
}
