import { SiteHeader } from "@/components/site-header"
import { BookDeleteView } from "@/components/book-delete-view"

export default async function DeleteBookPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return (
    <main className="min-h-svh">
      <SiteHeader />
      <BookDeleteView bookId={id} />
    </main>
  )
}
