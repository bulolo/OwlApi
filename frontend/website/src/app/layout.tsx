import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "OwlApi - SQL to API 智能网关平台",
  description: "编写 SQL，一键生成 RESTful API。混合云网关，打破内网边界。",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" className="dark scroll-smooth">
      <body className={`${inter.className} bg-background text-foreground antialiased selection:bg-indigo-500/30 selection:text-indigo-200`}>
        {children}
      </body>
    </html>
  )
}
