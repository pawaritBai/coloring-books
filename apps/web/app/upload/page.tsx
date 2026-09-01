import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { BatchUploadView } from "@/components/batch-upload-view"

export default function UploadPage() {
  return (
    <main className="min-h-svh">
      <SiteHeader showUpload={false} />
      <div className="w-full px-4 py-8 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to library
        </Link>

        <div className="mt-4 flex flex-col gap-1">
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            Upload books
          </h1>
          <p className="text-sm text-muted-foreground">
            Add one or more books, then create them all at once. Each needs a
            title, at least one category, and at least one file.
          </p>
        </div>

        <div className="mt-6">
          <BatchUploadView />
        </div>
      </div>
    </main>
  )
}
