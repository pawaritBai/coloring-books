import { Readable } from "node:stream"
import {
  allDriveParams,
  driveRootParent,
  getDrive,
  listScope,
} from "@/lib/drive/auth"
import type { FolderType, SectionType } from "@/lib/types"
import { slotKey, STORAGE_ROOT } from "@/lib/prefix-key"

const FOLDER_MIME = "application/vnd.google-apps.folder"

function esc(value: string): string {
  return value.replace(/'/g, "\\'")
}

/** Create a folder unconditionally (one Drive round-trip). */
async function createFolder(name: string, parentId: string): Promise<string> {
  const created = await getDrive().files.create({
    requestBody: { name, mimeType: FOLDER_MIME, parents: [parentId] },
    fields: "id",
    ...allDriveParams(),
  })
  const id = created.data.id
  if (!id) throw new Error(`Drive did not return an id for folder "${name}"`)
  return id
}

/** Find a child folder by name, or create it. Idempotent (two round-trips). */
async function ensureFolder(name: string, parentId: string): Promise<string> {
  const found = await getDrive().files.list({
    q: `name='${esc(name)}' and '${esc(parentId)}' in parents and mimeType='${FOLDER_MIME}' and trashed=false`,
    fields: "files(id)",
    pageSize: 1,
    ...allDriveParams(),
    ...listScope(),
  })
  const hit = found.data.files?.[0]?.id
  return hit ?? createFolder(name, parentId)
}

// The `books/` root never changes — resolve it once per server process.
const globalForDrive = globalThis as unknown as {
  __driveStorageRoot?: Promise<string>
}
function storageRootFolderId(): Promise<string> {
  if (!globalForDrive.__driveStorageRoot) {
    globalForDrive.__driveStorageRoot = ensureFolder(
      STORAGE_ROOT,
      driveRootParent(),
    ).catch((err) => {
      globalForDrive.__driveStorageRoot = undefined
      throw err
    })
  }
  return globalForDrive.__driveStorageRoot
}

export interface BookFolders {
  /** the per-book folder */
  rootFolderId: string
  /** "cover/final" -> Drive folder id */
  folders: Record<string, string>
}

/**
 * Create (or reuse) books/<bookId>/<section>/<folder> folders on Drive.
 *
 * Sibling folders are created in parallel. When the book folder is brand new
 * (no `existingRootFolderId`) its subfolders can't exist yet, so we skip the
 * "does it exist?" lookups and just create — cutting ~15 sequential round-trips
 * down to ~4.
 */
export async function ensureBookFolders(
  bookId: string,
  existingRootFolderId?: string,
): Promise<BookFolders> {
  const storageRoot = await storageRootFolderId()

  const fresh = !existingRootFolderId
  // A fresh book folder can't exist yet (its name is a unique counter id and a
  // failed ingest deletes the whole book), so skip the "does it exist?" lookup.
  const bookFolderId =
    existingRootFolderId ??
    (fresh
      ? await createFolder(bookId, storageRoot)
      : await ensureFolder(bookId, storageRoot))
  const mk = fresh ? createFolder : ensureFolder

  const [coverId, interiorId] = await Promise.all([
    mk("cover", bookFolderId),
    mk("interior", bookFolderId),
  ])

  const [coverFinal, coverExtra, interiorFinal, interiorExtra] =
    await Promise.all([
      mk("final", coverId),
      mk("extra", coverId),
      mk("final", interiorId),
      mk("extra", interiorId),
    ])

  return {
    rootFolderId: bookFolderId,
    folders: {
      [slotKey("cover", "final")]: coverFinal,
      [slotKey("cover", "extra")]: coverExtra,
      [slotKey("interior", "final")]: interiorFinal,
      [slotKey("interior", "extra")]: interiorExtra,
    },
  }
}

export interface UploadResult {
  fileId: string
  webViewLink: string | null
  md5Checksum: string | null
  size: number
  mimeType: string
}

export async function uploadToFolder(params: {
  parentFolderId: string
  name: string
  mimeType: string
  buffer: Buffer
}): Promise<UploadResult> {
  const drive = getDrive()
  const res = await drive.files.create({
    requestBody: { name: params.name, parents: [params.parentFolderId] },
    media: { mimeType: params.mimeType, body: Readable.from(params.buffer) },
    fields: "id, webViewLink, md5Checksum, size, mimeType",
    ...allDriveParams(),
  })
  const d = res.data
  if (!d.id) throw new Error("Drive upload returned no file id")
  return {
    fileId: d.id,
    webViewLink: d.webViewLink ?? null,
    md5Checksum: d.md5Checksum ?? null,
    size: d.size ? Number(d.size) : params.buffer.byteLength,
    mimeType: d.mimeType ?? params.mimeType,
  }
}

export async function deleteDriveFile(fileId: string): Promise<void> {
  try {
    await getDrive().files.delete({ fileId, ...allDriveParams() })
  } catch (err: unknown) {
    // ignore "already gone"
    const code = (err as { code?: number })?.code
    if (code !== 404) throw err
  }
}

export async function deleteDriveFiles(fileIds: string[]): Promise<void> {
  await Promise.all(fileIds.map(deleteDriveFile))
}

export function slotKeyOf(section: SectionType, folder: FolderType): string {
  return slotKey(section, folder)
}
