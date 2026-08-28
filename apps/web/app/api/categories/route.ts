import { handle } from "@/lib/api/responses"
import { ensureIndexes } from "@/lib/db/collections"
import { listCategories } from "@/lib/db/categories-repo"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export function GET() {
  return handle(async () => {
    await ensureIndexes()
    return Response.json({ categories: await listCategories() })
  })
}
