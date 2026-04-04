import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "OwlApi - SQL to API 智能网关平台",
  description: "编写 SQL，一键生成 RESTful API。混合云网关，打破内网边界。",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  )
}
