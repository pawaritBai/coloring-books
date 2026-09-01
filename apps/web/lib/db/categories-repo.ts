import { categories } from "@/lib/db/collections"

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export function normalizeCategory(name: string): string {
  return name.trim().replace(/\s+/g, " ")
}

export async function listCategories(): Promise<string[]> {
  const col = await categories()
  const docs = await col.find().sort({ name: 1 }).toArray()
  return docs.map((d) => d.name)
}

/** Insert the category if a matching slug doesn't already exist. */
export async function ensureCategory(name: string): Promise<string> {
  const clean = normalizeCategory(name)
  if (!clean) throw new Error("Category name is required")
  const col = await categories()
  const now = new Date()
  await col.updateOne(
    { slug: slugify(clean) },
    {
      $setOnInsert: { name: clean, slug: slugify(clean), createdAt: now },
      $set: { updatedAt: now },
    },
    { upsert: true },
  )
  return clean
}

/**
 * Register every name (in parallel), returning the names de-duplicated
 * (case-insensitive) and order-preserving.
 */
export async function ensureCategories(names: string[]): Promise<string[]> {
  const cleaned: string[] = []
  const seen = new Set<string>()
  for (const raw of names) {
    const clean = normalizeCategory(raw)
    if (!clean) continue
    const key = clean.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    cleaned.push(clean)
  }
  await Promise.all(cleaned.map((c) => ensureCategory(c)))
  return cleaned
}
