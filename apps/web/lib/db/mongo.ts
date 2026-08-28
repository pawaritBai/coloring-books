import { MongoClient, type Db } from "mongodb"

// Cache the client across HMR reloads in dev so we don't leak connections.
type Cache = { client: MongoClient; promise: Promise<MongoClient> }
const globalForMongo = globalThis as unknown as { __mongo?: Cache }

function getCache(): Cache {
  if (!globalForMongo.__mongo) {
    const uri = process.env.MONGODB_URI
    if (!uri) {
      throw new Error(
        "MONGODB_URI is not set. Copy apps/web/.env.example to apps/web/.env.local and fill it in.",
      )
    }
    const client = new MongoClient(uri)
    globalForMongo.__mongo = { client, promise: client.connect() }
  }
  return globalForMongo.__mongo
}

export async function getDb(): Promise<Db> {
  const { promise } = getCache()
  const client = await promise
  return client.db(process.env.MONGODB_DB || "bookshelf")
}
