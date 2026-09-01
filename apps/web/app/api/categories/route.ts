import { handle } from "@/lib/api/responses"
import { ensureIndexes } from "@/lib/db/collections"
import { listCategories } from "@/lib/db/categories-repo"
import { requireSession } from "@/lib/auth/require"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export function GET() {
  return handle(async () => {
    await requireSession()
    await ensureIndexes()
    return Response.json({ categories: await listCategories() })
  })
}
