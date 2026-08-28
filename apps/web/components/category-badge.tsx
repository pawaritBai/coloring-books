import { categoryHue } from "@/lib/types"
import { cn } from "@workspace/ui/lib/utils"

export function CategoryBadge({
  category,
  className,
}: {
  category: string
  className?: string
}) {
  const hue = categoryHue(category)
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        className,
      )}
      style={{
        color: `hsl(${hue} 55% 34%)`,
        backgroundColor: `hsl(${hue} 70% 92% / 0.7)`,
        borderColor: `hsl(${hue} 45% 62% / 0.4)`,
      }}
    >
      <span
        className="size-1.5 rounded-full"
        style={{ backgroundColor: `hsl(${hue} 60% 45%)` }}
        aria-hidden
      />
      {category}
    </span>
  )
}

/** Renders a list of category badges, optionally capped with a "+N" chip. */
export function CategoryBadges({
  categories,
  className,
  max,
}: {
  categories: string[]
  className?: string
  max?: number
}) {
  const shown = max != null ? categories.slice(0, max) : categories
  const rest = categories.length - shown.length
  return (
    <span className={cn("inline-flex flex-wrap items-center gap-1.5", className)}>
      {shown.map((c) => (
        <CategoryBadge key={c} category={c} />
      ))}
      {rest > 0 ? (
        <span className="rounded-full border border-border bg-card px-2 py-0.5 text-xs font-medium text-muted-foreground">
          +{rest}
        </span>
      ) : null}
    </span>
  )
}
