"use client"

import { useState, type FormEvent } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Library, Loader2 } from "lucide-react"
import { Input } from "@workspace/ui/components/input"
import { Button } from "@workspace/ui/components/button"
import { useAuth } from "@/components/auth-provider"

export function LoginForm() {
  const router = useRouter()
  const params = useSearchParams()
  const { refresh } = useAuth()

  const [login, setLogin] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login: login.trim(), password }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string
        } | null
        setError(data?.error ?? "Sign in failed. Please try again.")
        return
      }
      await refresh()
      const next = params.get("next")
      router.replace(next && next.startsWith("/") ? next : "/")
      router.refresh()
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-6 flex flex-col items-center gap-3 text-center">
        <span className="flex size-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Library className="size-6" />
        </span>
        <div>
          <h1 className="font-display text-xl font-semibold tracking-tight">
            Bookshelf
          </h1>
          <p className="text-sm text-muted-foreground">
            Sign in to the book file archive
          </p>
        </div>
      </div>

      <form
        onSubmit={onSubmit}
        className="flex flex-col gap-4 rounded-xl border border-border bg-card p-6"
        noValidate
      >
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Email or username</span>
          <Input
            autoFocus
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            autoComplete="username"
            className="h-11 text-base"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Password</span>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            className="h-11 text-base"
          />
        </label>

        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        <Button
          type="submit"
          disabled={busy || !login.trim() || !password}
          className="h-11 text-base"
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : null}
          {busy ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <p className="mt-4 text-center text-xs text-muted-foreground">
        Accounts are managed by an administrator.
      </p>
    </div>
  )
}
