import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Toaster } from "sonner";
import { cookies } from "next/headers";
import { QueryProvider } from "@/providers/QueryProvider";
import { PlatformBrandingProvider } from "@/providers/PlatformBrandingProvider";
import type { PlatformSettingsResp } from "@/lib/sdk";
import "./globals.css";

export const metadata: Metadata = {
  title: "OwlAPI - SQL 驱动的 API 构建器",
  description: "快速通过 SQL 语句生成 API 接口",
};

function readBrandingCookie(value: string | undefined): PlatformSettingsResp | null {
  if (!value) return null;
  try {
    return JSON.parse(decodeURIComponent(value)) as PlatformSettingsResp;
  } catch {
    return null;
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const initialBranding = readBrandingCookie(cookieStore.get("owl_pb")?.value);

  return (
    <html lang="zh">
      <body
        className={`${GeistSans.variable} ${GeistMono.variable} antialiased`}
      >
        <QueryProvider>
          <PlatformBrandingProvider initialData={initialBranding}>
            {children}
          </PlatformBrandingProvider>
        </QueryProvider>
        <Toaster
          position="top-right"
          richColors
          closeButton
          toastOptions={{
            style: { fontSize: "13px", fontWeight: 500 },
          }}
        />
      </body>
    </html>
  );
}
