/**
 * 前置 / 后置脚本的统一配色——与脚本库保持一致：
 *   • 前置 (pre)  = 橙色 (amber)
 *   • 后置 (post) = 蓝色 (primary)
 * 任何展示脚本链 / 前后置标签的地方都应复用这里，确保「橙=前置、蓝=后置」一眼可辨。
 */
export const PHASE_TONE: Record<"pre" | "post", {
  /** chip / pill：背景 + 文字 + 边框 */
  pill: string
  /** hover 态背景（用于可点击 pill） */
  pillHover: string
  /** 小圆点 */
  dot: string
  /** 图标 / 强调文字色 */
  accent: string
  /** 图标容器（预览弹窗 header 用） */
  iconBox: string
}> = {
  pre: {
    pill: "bg-amber-50 text-amber-600 border-amber-200",
    pillHover: "hover:bg-amber-100",
    dot: "bg-amber-400",
    accent: "text-amber-600",
    iconBox: "bg-amber-50 text-amber-600 border-amber-200",
  },
  post: {
    pill: "bg-primary/10 text-primary border-primary/30",
    pillHover: "hover:bg-primary/20",
    dot: "bg-primary/60",
    accent: "text-primary",
    iconBox: "bg-primary/10 text-primary border-primary/30",
  },
}

/** 把任意 type 字符串归一到 "pre" | "post"（非 pre 一律按 post 处理）。 */
export const phaseOf = (type: string): "pre" | "post" => (type === "pre" ? "pre" : "post")
