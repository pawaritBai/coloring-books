import { SiteHeader } from "@/components/site-header"
import { BookEditView } from "@/components/book-edit-view"

export default async function EditBookPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return (
    <main className="min-h-svh">
      <SiteHeader />
      <BookEditView bookId={id} />
    </main>
  )
}
