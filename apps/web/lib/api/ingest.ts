import { ObjectId } from "mongodb"
import type { FileDoc } from "@/lib/db/collections"
import { getBookDoc, setBookDrive } from "@/lib/db/books-repo"
import { insertFile } from "@/lib/db/files-repo"
import {
  deleteDriveFile,
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
 * Upload a batch of files to Drive and record them in Mongo. Creates the book's
 * Drive folder tree on first use. Returns the inserted file docs.
 */
export async function ingestFiles(
  bookId: string,
  incoming: IncomingFile[],
): Promise<FileDoc[]> {
  if (incoming.length === 0) return []

  let book = await getBookDoc(bookId)
  if (!book) throw new Error(`Book ${bookId} not found`)

  if (!book.drive.rootFolderId || Object.keys(book.drive.folders).length < 4) {
    const folders = await ensureBookFolders(bookId)
    await setBookDrive(bookId, folders)
    book = await getBookDoc(bookId)
    if (!book) throw new Error(`Book ${bookId} disappeared`)
  }

  const inserted: FileDoc[] = []

  for (const { file, section, folder } of incoming) {
    const parentFolderId = book.drive.folders[slotKey(section, folder)]
    if (!parentFolderId) {
      throw new Error(`No Drive folder for ${section}/${folder}`)
    }

    const _id = new ObjectId()
    const buffer = Buffer.from(await file.arrayBuffer())
    const mimeType = file.type || "application/octet-stream"
    const driveName = `${_id.toHexString()}__${safeName(file.name)}`

    const up = await uploadToFolder({
      parentFolderId,
      name: driveName,
      mimeType,
      buffer,
    })

    const now = new Date()
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

    try {
      inserted.push(await insertFile(doc))
    } catch (err) {
      // roll back the Drive upload so we don't leave an orphan
      await deleteDriveFile(up.fileId).catch(() => {})
      throw err
    }
  }

  return inserted
}
