import { SiteHeader } from "@/components/site-header"
import { LibraryView } from "@/components/library-view"

export default function HomePage() {
  return (
    <main className="min-h-svh">
      <SiteHeader />
      <LibraryView />
    </main>
  )
}
