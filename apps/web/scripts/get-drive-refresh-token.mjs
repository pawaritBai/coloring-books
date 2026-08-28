#!/usr/bin/env node
// One-time helper: obtain a Google Drive OAuth refresh token.
//
//   1. In Google Cloud console create an OAuth client (type: "Desktop app"),
//      OR a "Web application" client with redirect URI http://localhost:4571
//   2. Put the client id/secret in apps/web/.env.local (or pass as env vars)
//   3. Run:  node --env-file=apps/web/.env.local apps/web/scripts/get-drive-refresh-token.mjs
//   4. Visit the printed URL, approve, and copy GOOGLE_OAUTH_REFRESH_TOKEN into .env.local

import http from "node:http"
import { google } from "googleapis"

const PORT = Number(process.env.OAUTH_HELPER_PORT || 4571)
const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID
const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET

if (!clientId || !clientSecret) {
  console.error(
    "Set GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET first (env or apps/web/.env.local).",
  )
  process.exit(1)
}

const redirectUri = `http://localhost:${PORT}`
const oauth2 = new google.auth.OAuth2(clientId, clientSecret, redirectUri)

const authUrl = oauth2.generateAuthUrl({
  access_type: "offline",
  prompt: "consent",
  scope: ["https://www.googleapis.com/auth/drive"],
})

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, redirectUri)
  const code = url.searchParams.get("code")
  if (!code) {
    res.writeHead(400).end("Missing ?code")
    return
  }
  try {
    const { tokens } = await oauth2.getToken(code)
    res.writeHead(200, { "Content-Type": "text/plain" })
    res.end("Done. You can close this tab and return to the terminal.")
    console.log("\n──────────────────────────────────────────────")
    if (tokens.refresh_token) {
      console.log("GOOGLE_OAUTH_REFRESH_TOKEN=" + tokens.refresh_token)
    } else {
      console.log(
        "No refresh_token returned. Remove this app's access at",
        "https://myaccount.google.com/permissions and run again.",
      )
    }
    console.log("──────────────────────────────────────────────\n")
  } catch (err) {
    res.writeHead(500).end("Token exchange failed: " + err.message)
    console.error(err)
  } finally {
    server.close()
  }
})

server.listen(PORT, () => {
  console.log(`Listening on ${redirectUri}`)
  console.log("\nOpen this URL in your browser and approve:\n")
  console.log(authUrl + "\n")
})
