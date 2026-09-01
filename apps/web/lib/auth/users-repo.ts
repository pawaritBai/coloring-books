import { ObjectId } from "mongodb"
import { users, type UserDoc } from "@/lib/db/collections"

export type { UserDoc }

export interface PublicUser {
  id: string
  email: string
  username: string
}

export function toPublicUser(doc: UserDoc): PublicUser {
  return {
    id: String(doc._id),
    email: doc.email,
    username: doc.username,
  }
}

/** Look up by email (case-insensitive) or exact username. */
export async function findUserByLogin(login: string): Promise<UserDoc | null> {
  const clean = login.trim()
  if (!clean) return null
  const col = await users()
  return col.findOne({
    $or: [{ email: clean.toLowerCase() }, { username: clean }],
  })
}

export async function findUserById(id: string): Promise<UserDoc | null> {
  if (!ObjectId.isValid(id)) return null
  const col = await users()
  return col.findOne({ _id: new ObjectId(id) })
}
