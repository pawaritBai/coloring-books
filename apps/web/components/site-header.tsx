"use client"

import Link from "next/link"
import { Library, LogOut, Upload } from "lucide-react"
import { ButtonLink } from "@/components/button-link"
import { Button } from "@workspace/ui/components/button"
import { useAuth } from "@/components/auth-provider"

export function SiteHeader({ showUpload = true }: { showUpload?: boolean }) {
  const { user, logout } = useAuth()

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
      <div className="flex h-16 w-full items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Library className="size-5" />
          </span>
          <span className="flex flex-col leading-none">
            <span className="font-display text-lg font-semibold tracking-tight">
              Bookshelf
            </span>
            <span className="text-xs text-muted-foreground">
              Book file archive
            </span>
          </span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          {showUpload ? (
            <ButtonLink href="/upload">
              <Upload className="size-4" />
              Upload book
            </ButtonLink>
          ) : null}

          {user ? (
            <div className="flex items-center gap-2">
              <span className="hidden text-sm text-muted-foreground sm:inline">
                {user.username}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => void logout()}
                aria-label="Log out"
              >
                <LogOut className="size-4" />
                <span className="hidden sm:inline">Log out</span>
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  )
}
