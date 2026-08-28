"use client"

import { useState } from "react"
import { Check, Plus, X } from "lucide-react"
import { Input } from "@workspace/ui/components/input"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

function normalize(name: string) {
  return name.trim().replace(/\s+/g, " ")
}

/**
 * Edit a book's categories: a book can have several, added from the existing
 * list or typed fresh, removed individually — but at least one is required
 * (enforced by the form, this component just shows the invalid state).
 */
export function CategoryEditor({
  value,
  onChange,
  options,
  invalid,
}: {
  value: string[]
  onChange: (next: string[]) => void
  options: string[]
  invalid?: boolean
}) {
  const [adding, setAdding] = useState(false)
  const [typed, setTyped] = useState("")

  const has = (c: string) =>
    value.some((v) => v.toLowerCase() === c.toLowerCase())
  const available = options.filter((o) => !has(o))

  function add(raw: string) {
    const clean = normalize(raw)
    if (!clean || has(clean)) return
    onChange([...value, clean])
  }

  function commitTyped() {
    add(typed)
    setTyped("")
    setAdding(false)
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-2.5 rounded-lg border p-3",
        invalid ? "border-destructive" : "border-input",
      )}
    >
      {value.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5">
          {value.map((c) => (
            <li key={c}>
              <span className="inline-flex items-center gap-1 rounded-full border border-border bg-card py-1 pl-3 pr-1.5 text-sm">
                {c}
                <button
                  type="button"
                  onClick={() => onChange(value.filter((v) => v !== c))}
                  aria-label={`Remove ${c}`}
                  className="rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">
          No categories yet — add at least one.
        </p>
      )}

      {adding ? (
        <div className="flex gap-2">
          <Input
            autoFocus
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                commitTyped()
              }
              if (e.key === "Escape") {
                setAdding(false)
                setTyped("")
              }
            }}
            placeholder="New category name"
            className="h-10"
          />
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="size-10"
            aria-label="Add category"
            onClick={commitTyped}
          >
            <Check className="size-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-10"
            aria-label="Cancel"
            onClick={() => {
              setAdding(false)
              setTyped("")
            }}
          >
            <X className="size-4" />
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {available.length > 0 ? (
            <select
              value=""
              onChange={(e) => {
                if (e.target.value) add(e.target.value)
              }}
              aria-label="Add an existing category"
              className="h-10 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
            >
              <option value="">Add existing…</option>
              {available.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          ) : null}
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-10"
            onClick={() => setAdding(true)}
          >
            <Plus className="size-4" />
            New
          </Button>
        </div>
      )}
    </div>
  )
}
