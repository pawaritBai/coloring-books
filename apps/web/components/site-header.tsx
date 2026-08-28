import Link from "next/link"
import { Library, Upload } from "lucide-react"
import { ButtonLink } from "@/components/button-link"


export function SiteHeader({ showUpload = true }: { showUpload?: boolean }) {
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
        {showUpload ? (
          <ButtonLink href="/upload">
            <Upload className="size-4" />
            Upload book
          </ButtonLink>
        ) : null}
      </div>
    </header>
  )
}
