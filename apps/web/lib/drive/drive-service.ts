import { Readable } from "node:stream"
import {
  allDriveParams,
  driveRootParent,
  getDrive,
  listScope,
} from "@/lib/drive/auth"
import { FOLDERS, SECTIONS, type FolderType, type SectionType } from "@/lib/types"
import { slotKey, STORAGE_ROOT } from "@/lib/prefix-key"

const FOLDER_MIME = "application/vnd.google-apps.folder"

function esc(value: string): string {
  return value.replace(/'/g, "\\'")
}

/** Find a child folder by name, or create it. Idempotent. */
async function ensureFolder(name: string, parentId: string): Promise<string> {
  const drive = getDrive()
  const found = await drive.files.list({
    q: `name='${esc(name)}' and '${esc(parentId)}' in parents and mimeType='${FOLDER_MIME}' and trashed=false`,
    fields: "files(id)",
    pageSize: 1,
    ...allDriveParams(),
    ...listScope(),
  })
  const hit = found.data.files?.[0]?.id
  if (hit) return hit

  const created = await drive.files.create({
    requestBody: { name, mimeType: FOLDER_MIME, parents: [parentId] },
    fields: "id",
    ...allDriveParams(),
  })
  const id = created.data.id
  if (!id) throw new Error(`Drive did not return an id for folder "${name}"`)
  return id
}

export interface BookFolders {
  /** the per-book folder */
  rootFolderId: string
  /** "cover/final" -> Drive folder id */
  folders: Record<string, string>
}

/** Create (or reuse) books/<bookId>/<section>/<folder> folders on Drive. */
export async function ensureBookFolders(bookId: string): Promise<BookFolders> {
  const storageRoot = await ensureFolder(STORAGE_ROOT, driveRootParent())
  const bookFolderId = await ensureFolder(bookId, storageRoot)

  const folders: Record<string, string> = {}
  for (const section of SECTIONS) {
    const sectionFolderId = await ensureFolder(section, bookFolderId)
    for (const folder of FOLDERS) {
      folders[slotKey(section, folder)] = await ensureFolder(
        folder,
        sectionFolderId,
      )
    }
  }
  return { rootFolderId: bookFolderId, folders }
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
