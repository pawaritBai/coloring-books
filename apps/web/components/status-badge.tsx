import { CircleCheck, CircleDashed } from "lucide-react"
import {
  EXTRA_STATUS_LABELS,
  getExtraStatus,
  getFinishStatus,
  type Book,
  type ExtraStatus,
} from "@/lib/types"
import { cn } from "@workspace/ui/lib/utils"

const EXTRA_DOT: Record<ExtraStatus, string> = {
  green: "bg-emerald-500",
  yellow: "bg-amber-500",
  red: "bg-red-500",
}

const EXTRA_TEXT: Record<ExtraStatus, string> = {
  green:
    "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  yellow:
    "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  red: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400",
}

/** Status 1 — finished / not finished. */
export function FinishBadge({
  book,
  className,
}: {
  book: Book
  className?: string
}) {
  const finished = getFinishStatus(book) === "finished"
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium",
        finished
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
          : "border-border bg-muted text-muted-foreground",
        className,
      )}
    >
      {finished ? (
        <CircleCheck className="size-3.5" />
      ) : (
        <CircleDashed className="size-3.5" />
      )}
      {finished ? "Finished" : "Not finished"}
    </span>
  )
}

/** Status 2 — extra completeness, only shown when the book is finished. */
export function ExtraBadge({
  book,
  className,
}: {
  book: Book
  className?: string
}) {
  const status = getExtraStatus(book)
  if (!status) return null
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium",
        EXTRA_TEXT[status],
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", EXTRA_DOT[status])} aria-hidden />
      {EXTRA_STATUS_LABELS[status]}
    </span>
  )
}

export function StatusBadges({
  book,
  className,
}: {
  book: Book
  className?: string
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      <FinishBadge book={book} />
      <ExtraBadge book={book} />
    </div>
  )
}
