import { ObjectId } from "mongodb"
import type { BookDoc, FileDoc } from "@/lib/db/collections"
import { setBookDrive } from "@/lib/db/books-repo"
import { insertFiles } from "@/lib/db/files-repo"
import {
  deleteDriveFiles,
  ensureBookFolders,
  uploadToFolder,
} from "@/lib/drive/drive-service"
import { safeName, slotKey, slotPrefix, storageKey } from "@/lib/prefix-key"
import type { FileKind, FolderType, SectionType } from "@/lib/types"

export interface IncomingFile {
  file: File
  section: SectionType
  folder: FolderType
}

function kindOf(mime: string): FileKind {
  return mime === "application/pdf" ? "pdf" : "image"
}

/**
 * How many files to push to Drive at the same time. Drive uploads are
 * latency-bound (~2s each regardless of size), so a wide fan-out barely
 * costs more than a single upload.
 */
const UPLOAD_CONCURRENCY = 12

async function mapSettled<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = new Array(items.length)
  let cursor = 0
  async function worker() {
    while (cursor < items.length) {
      const i = cursor++
      try {
        results[i] = { status: "fulfilled", value: await fn(items[i] as T) }
      } catch (reason) {
        results[i] = { status: "rejected", reason }
      }
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, worker),
  )
  return results
}

/**
 * Upload a batch of files to Drive (in parallel) and record them in Mongo with
 * a single insert. Creates the book's Drive folder tree on first use.
 */
export async function ingestFiles(
  book: BookDoc,
  incoming: IncomingFile[],
): Promise<FileDoc[]> {
  if (incoming.length === 0) return []
  const bookId = book.bookId

  let driveFolders = book.drive.folders
  if (!book.drive.rootFolderId || Object.keys(driveFolders).length < 4) {
    const folders = await ensureBookFolders(
      bookId,
      book.drive.rootFolderId || undefined,
    )
    await setBookDrive(bookId, folders)
    driveFolders = folders.folders
  }

  const now = new Date()

  const settled = await mapSettled(
    incoming,
    UPLOAD_CONCURRENCY,
    async ({ file, section, folder }) => {
      const parentFolderId = driveFolders[slotKey(section, folder)]
      if (!parentFolderId) {
        throw new Error(`No Drive folder for ${section}/${folder}`)
      }
      const _id = new ObjectId()
      const buffer = Buffer.from(await file.arrayBuffer())
      const mimeType = file.type || "application/octet-stream"
      const up = await uploadToFolder({
        parentFolderId,
        name: `${_id.toHexString()}__${safeName(file.name)}`,
        mimeType,
        buffer,
      })
      const doc: FileDoc = {
        _id,
        bookId,
        section,
        folder,
        kind: kindOf(up.mimeType),
        prefixKey: slotPrefix(bookId, section, folder),
        storageKey: storageKey(
          bookId,
          section,
          folder,
          _id.toHexString(),
          file.name,
        ),
        name: file.name,
        mimeType: up.mimeType,
        size: up.size,
        checksum: up.md5Checksum,
        drive: {
          fileId: up.fileId,
          parentFolderId,
          webViewLink: up.webViewLink,
        },
        createdAt: now,
        updatedAt: now,
      }
      return doc
    },
  )

  const uploaded = settled.flatMap((s) =>
    s.status === "fulfilled" ? [s.value] : [],
  )
  const firstError = settled.find((s) => s.status === "rejected")

  if (firstError) {
    // clean up whatever made it to Drive before the failure
    await deleteDriveFiles(uploaded.map((d) => d.drive.fileId)).catch(() => {})
    throw (firstError as PromiseRejectedResult).reason
  }

  try {
    await insertFiles(uploaded)
  } catch (err) {
    await deleteDriveFiles(uploaded.map((d) => d.drive.fileId)).catch(() => {})
    throw err
  }

  return uploaded
}
