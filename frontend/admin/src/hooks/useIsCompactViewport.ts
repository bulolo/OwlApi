import { useSyncExternalStore } from "react"

/**
 * 视口是否小于 Tailwind 的 lg 断点 (1024px)。
 * 主要给 Sidebar 用：小屏下强制 collapsed（icon-only 60px 宽），
 * 但仍然可见——避免直接整条 hidden 让用户无路可走。
 *
 * 使用 useSyncExternalStore 订阅 matchMedia（React 推荐订阅外部 store 的写法），
 * 避开 useEffect + setState 这种级联渲染反模式。
 * SSR 上 getServerSnapshot 返回 false（按宽屏渲染），mount 后客户端自动同步。
 */
const COMPACT_QUERY = "(max-width: 1023.5px)"

function subscribe(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {}
  const mq = window.matchMedia(COMPACT_QUERY)
  mq.addEventListener("change", callback)
  return () => mq.removeEventListener("change", callback)
}

function getSnapshot(): boolean {
  return window.matchMedia(COMPACT_QUERY).matches
}

function getServerSnapshot(): boolean {
  return false
}

export function useIsCompactViewport(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
