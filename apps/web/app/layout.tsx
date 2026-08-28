import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { BookStoreProvider } from "@/components/book-store-provider"
import "@workspace/ui/globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/sonner"
import { cn } from "@workspace/ui/lib/utils"

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" })

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export const metadata: Metadata = {
  title: "Bookshelf — Book file archive",
  description:
    "Organize book cover and interior files by category, track their status, and manage uploads.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("antialiased", fontMono.variable, "font-sans", geist.variable)}
    >
      <body>
        <ThemeProvider>
          <BookStoreProvider>{children}</BookStoreProvider>
          <Toaster position="bottom-right" />
        </ThemeProvider>
      </body>
    </html>
  )
}
