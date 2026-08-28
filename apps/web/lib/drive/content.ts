import type { Readable } from "node:stream"
import { allDriveParams, getDrive } from "@/lib/drive/auth"

export interface DriveFileMeta {
  name: string
  mimeType: string
  size: number | null
}

export async function getDriveFileMeta(fileId: string): Promise<DriveFileMeta> {
  const res = await getDrive().files.get({
    fileId,
    fields: "name, mimeType, size",
    ...allDriveParams(),
  })
  return {
    name: res.data.name ?? "file",
    mimeType: res.data.mimeType ?? "application/octet-stream",
    size: res.data.size ? Number(res.data.size) : null,
  }
}

/** Node Readable stream of the raw file bytes. */
export async function getDriveFileStream(fileId: string): Promise<Readable> {
  const res = await getDrive().files.get(
    { fileId, alt: "media", ...allDriveParams() },
    { responseType: "stream" },
  )
  return res.data as unknown as Readable
}
