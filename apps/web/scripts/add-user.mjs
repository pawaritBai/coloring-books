#!/usr/bin/env node
// Add (or update the password of) a login user.
//
//   node --env-file=apps/web/.env.local apps/web/scripts/add-user.mjs \
//        --email me@example.com --username me --password "at-least-8-chars"
//
// Missing flags are prompted for. Re-running with an existing email updates
// that user's username + password. There is no sign-up in the app itself.

import { createInterface } from "node:readline/promises"
import { stdin, stdout } from "node:process"
import { MongoClient } from "mongodb"
import { hash } from "bcryptjs"

const MONGODB_URI = process.env.MONGODB_URI
const MONGODB_DB = process.env.MONGODB_DB || "bookshelf"
if (!MONGODB_URI) {
  console.error("MONGODB_URI is not set (use --env-file=apps/web/.env.local).")
  process.exit(1)
}

function flag(name) {
  const i = process.argv.indexOf(`--${name}`)
  return i !== -1 ? process.argv[i + 1] : undefined
}

async function main() {
  const rl = createInterface({ input: stdin, output: stdout })
  const email = (flag("email") ?? (await rl.question("Email: "))).trim().toLowerCase()
  const username = (flag("username") ?? (await rl.question("Username: "))).trim()
  const password = flag("password") ?? (await rl.question("Password: "))
  rl.close()

  if (!email.includes("@")) {
    console.error("Invalid email.")
    process.exit(1)
  }
  if (!username) {
    console.error("Username is required.")
    process.exit(1)
  }
  if (!password || password.length < 8) {
    console.error("Password must be at least 8 characters.")
    process.exit(1)
  }

  const client = new MongoClient(MONGODB_URI)
  await client.connect()
  const col = client.db(MONGODB_DB).collection("users")
  await col.createIndex({ email: 1 }, { unique: true })
  await col.createIndex({ username: 1 }, { unique: true })

  const now = new Date()
  const passwordHash = await hash(password, 10)

  try {
    await col.updateOne(
      { email },
      {
        $set: { username, passwordHash, updatedAt: now },
        $setOnInsert: { email, createdAt: now },
      },
      { upsert: true },
    )
  } catch (err) {
    if (err?.code === 11000) {
      console.error(`Username "${username}" is already taken by another user.`)
      process.exit(1)
    }
    throw err
  }

  const doc = await col.findOne({ email }, { projection: { passwordHash: 0 } })
  console.log("user saved:", doc)
  await client.close()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
