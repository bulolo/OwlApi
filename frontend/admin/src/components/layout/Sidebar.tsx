"use client"

import Link from "next/link"
import { useState, useRef, useEffect } from "react"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Box,
  Server,
  Database,
  PanelLeftClose,
  PanelLeftOpen,
  FileCode2,
  Github,
  BookOpen,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useUIStore } from "@/store/useUIStore"
import { useIsCompactViewport } from "@/hooks/useIsCompactViewport"
import { useEdition } from "@/hooks/useEdition"
import { usePlatformBranding } from "@/hooks/usePlatformBranding"
import pkg from "../../../package.json"

export function Sidebar({ slug }: { slug?: string }) {
  const { sidebarCollapsed, setSidebarCollapsed } = useUIStore()
  // 小屏（< lg, 1024px）强制折叠：保留侧边栏可见，但只显示图标，避免用户无路可走
  const isCompact = useIsCompactViewport()
  const collapsed = sidebarCollapsed || isCompact
  const { isEnterprise, isLicensed } = useEdition()
  // 三态：CE / EE·授权 / EE·未授权（橙色提醒）
  const editionLabel = !isEnterprise ? "CE" : isLicensed ? "EE" : "EE·未授权"
  const editionTone = !isEnterprise
    ? "bg-zinc-50 text-muted-foreground border-border-subtle"
    : isLicensed
      ? "bg-violet-50 text-violet-700 border-violet-200"
      : "bg-amber-50 text-amber-700 border-amber-200"

  const { isLoaded, platformName, platformTagline, logoSrc } = usePlatformBranding()
  const [imgReady, setImgReady] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)

  // 缓存图片的 load 事件在 React 挂载事件监听器之前就已触发，需主动检测 complete
  useEffect(() => {
    if (imgRef.current?.complete) setImgReady(true)
  }, [logoSrc, isLoaded])

  const activeTenant = slug ?? ""

  const MENUS = [
    {
      group: "控制台",
      items: [
        { href: `/${activeTenant}/overview`, label: "概览", icon: LayoutDashboard },
      ]
    },
    {
      group: "核心资源",
      items: [
        { href: `/${activeTenant}/gateways`, label: "网关", icon: Server },
        { href: `/${activeTenant}/data-sources`, label: "数据源", icon: Database },
        { href: `/${activeTenant}/scripts`, label: "脚本库", icon: FileCode2 },
      ]
    },
    {
      group: "工作空间",
      items: [
        { href: `/${activeTenant}/projects`, label: "项目", icon: Box },
      ]
    },
  ]

  return (
    <aside className={cn(
      "bg-white border-r border-border-subtle fixed h-full z-40 flex flex-col transition-all duration-300",
      collapsed ? "w-[60px]" : "w-56"
    )}>
      {/* Brand */}
      <div className={cn("h-16 flex items-center mb-1", collapsed ? "px-3 justify-center" : "px-5")}>
        <Link href={`/${activeTenant}/overview`} className="flex items-center gap-3 group">
          {/* 相对定位容器：骨架和图片叠放，图片 onLoad 后才显示，完全避免拉伸帧 */}
          <div style={{ position: "relative", width: 36, height: 36, minWidth: 36, flexShrink: 0 }}>
            {/* 骨架：数据未就绪 或 图片未加载完成时显示 */}
            {(!isLoaded || !imgReady) && (
              <div className="absolute inset-0 rounded-lg bg-zinc-100 animate-pulse" />
            )}
            {/* 图片：始终挂载以触发加载，onLoad 前 opacity:0 不可见 */}
            {isLoaded && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                ref={imgRef}
                key={logoSrc}
                src={logoSrc}
                alt={platformName}
                onLoad={() => setImgReady(true)}
                style={{
                  display: "block",
                  width: 36,
                  height: 36,
                  objectFit: "contain",
                  opacity: imgReady ? 1 : 0,
                }}
              />
            )}
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              {isLoaded ? (
                <>
                  <span className="text-lg font-bold text-foreground tracking-tight leading-none group-hover:text-primary transition-colors">{platformName}</span>
                  <span className="text-2xs font-bold text-muted-foreground uppercase tracking-widest mt-1.5">{platformTagline}</span>
                </>
              ) : (
                <div className="flex flex-col gap-1.5">
                  <div className="h-4 w-20 bg-zinc-100 rounded animate-pulse" />
                  <div className="h-2 w-16 bg-zinc-100 rounded animate-pulse" />
                </div>
              )}
            </div>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className={cn("flex-1 space-y-6 overflow-y-auto overflow-x-hidden pt-1 pb-4 custom-scrollbar", collapsed ? "px-2" : "px-4")}>
        {MENUS.map((group, idx) => (
          <div key={idx} className="space-y-1.5">
            {!collapsed && (
              <h3 className="px-3 text-2xs font-bold text-muted-foreground uppercase tracking-[0.15em]">
                {group.group}
              </h3>
            )}
            <div className="space-y-1">
              {group.items.map((item) => (
                <NavItem key={item.href} {...item} collapsed={collapsed} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      {collapsed ? (
        <div className="mt-auto px-2 py-4 flex flex-col items-center gap-3">
          <Link
            href="https://github.com/bulolo/owlapi"
            target="_blank"
            title="GitHub"
            className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-zinc-700 hover:bg-zinc-50 transition-colors"
          >
            <Github className="w-4 h-4" />
          </Link>
          <span className="px-1.5 py-0.5 bg-primary/10 text-primary/80 rounded-full text-2xs font-bold border border-primary/20">
            v{pkg.version}
          </span>
          {/* 小屏强制 collapsed，不允许手动展开（点了也没用） */}
          {!isCompact && (
            <button
              onClick={() => setSidebarCollapsed(false)}
              className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-zinc-600 hover:bg-zinc-100 transition-colors"
              title="展开侧边栏"
            >
              <PanelLeftOpen className="w-4 h-4" />
            </button>
          )}
        </div>
      ) : (
        <div className="mt-auto px-4 py-5 space-y-5">
          <div className="space-y-1">
            <Link
              href="https://github.com/bulolo/owlapi"
              target="_blank"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-muted-foreground hover:text-zinc-700 hover:bg-zinc-50 transition-all group"
            >
              <Github className="w-4 h-4 opacity-60 group-hover:opacity-100 transition-opacity" />
              <span className="font-medium">GitHub</span>
            </Link>
            <Link
              href="https://github.com/bulolo/owlapi/wiki"
              target="_blank"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-muted-foreground hover:text-zinc-700 hover:bg-zinc-50 transition-all group"
            >
              <BookOpen className="w-4 h-4 opacity-60 group-hover:opacity-100 transition-opacity" />
              <span className="font-medium">文档</span>
            </Link>
          </div>

          <div className="space-y-3 pt-2 border-t border-border-subtle/80">
            <div className="flex items-center justify-between px-1">
              {isLoaded
                ? <span className="text-2xs font-bold tracking-wider text-zinc-300 uppercase">{platformName}</span>
                : <div className="h-2 w-12 bg-zinc-100 rounded animate-pulse" />
              }
              <div className="flex items-center gap-1.5">
                <span
                  className={cn(
                    "px-2 py-0.5 rounded-full text-2xs font-bold tracking-wide border shadow-sm",
                    editionTone,
                  )}
                  title={isEnterprise && !isLicensed ? "Enterprise 构建但 license 未通过校验，EE 功能已回退到 CE 行为" : undefined}
                >
                  {editionLabel}
                </span>
                <span className="px-2 py-0.5 bg-primary/10 text-primary/80 rounded-full text-2xs font-bold border border-primary/20 shadow-sm">
                  v{pkg.version}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex-1 text-center text-2xs text-zinc-300/70 font-medium">© 2026 {isLoaded ? platformName : ""}</span>
              <button
                onClick={() => setSidebarCollapsed(true)}
                className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-zinc-600 hover:bg-zinc-100 transition-colors"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}

function NavItem({ href, icon: Icon, label, collapsed }: { href: string; icon: React.ComponentType<{ className?: string }>; label: string; collapsed: boolean }) {
  const pathname = usePathname()
  const isActive = pathname === href || (href !== '/' && pathname.startsWith(`${href}/`))

  return (
    <Link href={href} className="block relative group" title={collapsed ? label : undefined}>
      <div className={cn(
        "flex items-center gap-3 rounded-lg transition-all duration-300 relative",
        collapsed ? "px-2 py-2 justify-center" : "px-3 py-2",
        isActive
          ? "bg-primary/10 text-primary shadow-sm"
          : "text-muted-foreground hover:text-foreground hover:bg-zinc-50"
      )}>
        <div className={cn(
          "flex items-center justify-center w-6 h-6 shrink-0 rounded-lg transition-all duration-300",
          isActive ? "bg-white shadow-sm" : "bg-transparent"
        )}>
          <Icon className={cn(
            "w-[18px] h-[18px] transition-all",
            isActive ? "text-primary scale-110" : "text-muted-foreground group-hover:text-foreground group-hover:scale-105"
          )} />
        </div>
        {!collapsed && (
          <span className={cn(
            "text-xs font-medium tracking-tight transition-all duration-200",
            isActive ? "text-primary font-bold translate-x-0.5" : "text-zinc-600 group-hover:translate-x-0.5"
          )}>
            {label}
          </span>
        )}
        {isActive && !collapsed && (
          <div className="absolute -left-2 w-1.5 h-6 bg-primary rounded-full shadow-glow" />
        )}
      </div>
    </Link>
  )
}
