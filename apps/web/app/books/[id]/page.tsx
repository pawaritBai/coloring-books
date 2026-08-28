import { SiteHeader } from "@/components/site-header"
import { BookDetailView } from "@/components/book-detail-view"

export default async function BookPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return (
    <main className="min-h-svh">
      <SiteHeader />
      <BookDetailView bookId={id} />
    </main>
  )
}
