"use client"

import type { ReactNode } from "react"
import { AlertDialog } from "@base-ui/react/alert-dialog"
import { buttonVariants } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

export interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: ReactNode
  /** extra content rendered between the description and the actions */
  children?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  onConfirm: () => void
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[1px] transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <AlertDialog.Popup className="fixed left-1/2 top-1/2 z-50 flex w-[min(28rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-xl border border-border bg-popover p-5 text-popover-foreground shadow-lg transition-[transform,opacity] duration-150 data-ending-style:scale-[0.98] data-ending-style:opacity-0 data-starting-style:scale-[0.98] data-starting-style:opacity-0">
          <div className="flex flex-col gap-1.5">
            <AlertDialog.Title className="text-base font-semibold">
              {title}
            </AlertDialog.Title>
            {description ? (
              <AlertDialog.Description className="text-sm text-muted-foreground">
                {description}
              </AlertDialog.Description>
            ) : null}
          </div>
          {children ? <div className="text-sm">{children}</div> : null}
          <div className="flex justify-end gap-2">
            <AlertDialog.Close
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              {cancelLabel}
            </AlertDialog.Close>
            <AlertDialog.Close
              onClick={onConfirm}
              className={cn(
                buttonVariants({
                  variant: destructive ? "destructive" : "default",
                  size: "sm",
                }),
              )}
            >
              {confirmLabel}
            </AlertDialog.Close>
          </div>
        </AlertDialog.Popup>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}
