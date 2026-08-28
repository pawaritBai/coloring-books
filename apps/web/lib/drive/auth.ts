import { google, type drive_v3 } from "googleapis"

const SCOPES = ["https://www.googleapis.com/auth/drive"]

let cached: drive_v3.Drive | undefined

function authMode(): "oauth" | "service" {
  return process.env.GDRIVE_AUTH_MODE === "service" ? "service" : "oauth"
}

export function getDrive(): drive_v3.Drive {
  if (cached) return cached

  if (authMode() === "service") {
    const json = process.env.GOOGLE_CREDENTIALS_JSON
    const auth = new google.auth.GoogleAuth({
      scopes: SCOPES,
      ...(json
        ? { credentials: JSON.parse(json) }
        : {
            keyFile:
              process.env.GOOGLE_APPLICATION_CREDENTIALS || "./credentials.json",
          }),
    })
    cached = google.drive({ version: "v3", auth })
  } else {
    const id = process.env.GOOGLE_OAUTH_CLIENT_ID
    const secret = process.env.GOOGLE_OAUTH_CLIENT_SECRET
    const refresh = process.env.GOOGLE_OAUTH_REFRESH_TOKEN
    if (!id || !secret || !refresh) {
      throw new Error(
        "GDRIVE_AUTH_MODE=oauth requires GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET and GOOGLE_OAUTH_REFRESH_TOKEN. Run: node apps/web/scripts/get-drive-refresh-token.mjs",
      )
    }
    const oauth2 = new google.auth.OAuth2(id, secret)
    oauth2.setCredentials({ refresh_token: refresh })
    cached = google.drive({ version: "v3", auth: oauth2 })
  }
  return cached
}

/** Extra params required on every call when talking to a Shared Drive. */
export function allDriveParams(): {
  supportsAllDrives?: boolean
  includeItemsFromAllDrives?: boolean
} {
  return authMode() === "service"
    ? { supportsAllDrives: true, includeItemsFromAllDrives: true }
    : {}
}

/** Container that per-book folders are created inside. */
export function driveRootParent(): string {
  const root =
    process.env.GDRIVE_ROOT_FOLDER_ID ||
    (authMode() === "service" ? process.env.GDRIVE_SHARED_DRIVE_ID : undefined)
  if (!root) {
    throw new Error(
      "Set GDRIVE_ROOT_FOLDER_ID (a folder id from your Drive), or GDRIVE_SHARED_DRIVE_ID in service mode.",
    )
  }
  return root
}

/** For list queries scoped to a Shared Drive. */
export function listScope(): Record<string, unknown> {
  const driveId = process.env.GDRIVE_SHARED_DRIVE_ID
  return authMode() === "service" && driveId
    ? { corpora: "drive", driveId }
    : {}
}
