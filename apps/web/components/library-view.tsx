"use client"

import { useMemo, useState } from "react"
import { BookOpen, Loader2, Search, TriangleAlert } from "lucide-react"
import { BookCard } from "@/components/book-card"
import { Input } from "@workspace/ui/components/input"
import { Button } from "@workspace/ui/components/button"
import { useBookStore } from "@/components/book-store-provider"
import {
  STATUS_FILTER_LABELS,
  matchesStatusFilter,
  type StatusFilter,
} from "@/lib/types"
import { cn } from "@workspace/ui/lib/utils"

const STATUS_ORDER: StatusFilter[] = [
  "all",
  "finished",
  "unfinished",
  "extra:green",
  "extra:yellow",
  "extra:red",
]

export function LibraryView() {
  const { books, categories, loading, error, refreshAll } = useBookStore()
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState<string>("all")
  const [status, setStatus] = useState<StatusFilter>("all")

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return books.filter((b) => {
      const matchesCategory =
        category === "all" || b.categories.includes(category)
      const matchesQuery =
        q === "" ||
        b.title.toLowerCase().includes(q) ||
        b.id.toLowerCase().includes(q) ||
        (b.subtitle?.toLowerCase().includes(q) ?? false)
      return matchesCategory && matchesQuery && matchesStatusFilter(b, status)
    })
  }, [books, query, category, status])

  const counts = useMemo(() => {
    const map: Record<string, number> = { all: books.length }
    for (const c of categories) map[c] = 0
    for (const b of books)
      for (const c of b.categories) map[c] = (map[c] ?? 0) + 1
    return map
  }, [books, categories])

  const chips: string[] = ["all", ...categories]

  return (
    <div className="w-full px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-balance">
          Library
        </h1>
        <p className="text-muted-foreground">
          Browse and manage book cover &amp; interior files by category and
          status.
        </p>
      </div>

      <div className="mt-6 flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative w-full max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by title, subtitle, or ID…"
              className="pl-9"
              aria-label="Search books"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            Status
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as StatusFilter)}
              className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
            >
              {STATUS_ORDER.map((s) => (
                <option key={s} value={s}>
                  {STATUS_FILTER_LABELS[s]}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {chips.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                category === c
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              {c === "all" ? "All" : c}
              <span
                className={cn(
                  "rounded-full px-1.5 text-xs",
                  category === c
                    ? "bg-primary-foreground/20"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {counts[c] ?? 0}
              </span>
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <div className="mt-16 flex flex-col items-center justify-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 py-20 text-center">
          <TriangleAlert className="size-10 text-destructive" />
          <p className="font-medium">Couldn’t load the library</p>
          <p className="max-w-md text-sm text-muted-foreground">{error}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void refreshAll()}
          >
            Try again
          </Button>
        </div>
      ) : loading && books.length === 0 ? (
        <div className="mt-16 flex justify-center py-20">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="mt-16 flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border py-20 text-center">
          <BookOpen className="size-10 text-muted-foreground" />
          <p className="font-medium">No books found</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Try a different search term, category, or status — or upload a new
            book.
          </p>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-[repeat(auto-fill,minmax(200px,1fr))]">
          {filtered.map((book) => (
            <BookCard key={book.id} book={book} />
          ))}
        </div>
      )}
    </div>
  )
}
