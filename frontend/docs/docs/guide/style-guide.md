# 设计语言规范

本文档定义了 Admin 管理控制台的视觉设计规范。所有新增页面和组件应遵循此规范。

---

## 🎨 Design Tokens

所有视觉属性通过 CSS 变量（`app/globals.css`）定义，并经由 `@theme inline` 映射为 Tailwind 工具类。
修改视觉风格时，**只需改变量值**，不要在业务代码中硬编码。

### 字体大小（5 档）

| Tailwind 类 | 大小 | 用途 |
|------------|------|------|
| `text-2xs` | 10px | 微标签、Badge、元数据、时间戳 |
| `text-xs` | 12px | 表格内容、次要描述、表单标签 |
| `text-sm` | 14px | 正文（body 默认）、按钮文字 |
| `text-base` | 16px | 较大正文（慎用） |
| `text-lg` | 18px | 页面/弹窗标题 |

### 圆角（5 档 + full）

| Tailwind 类 | 大小 | 用途 |
|------------|------|------|
| `rounded-md` | 6px | Input、Select trigger、小型控件 |
| `rounded-lg` | 8px | Button、Card、通用容器 |
| `rounded-xl` | 12px | DropdownMenu、Popover、Select content |
| `rounded-2xl` | 16px | 弹窗（Dialog）内容区 |
| `rounded-3xl` | 24px | 全屏 Modal（如设置弹窗） |
| `rounded-full` | 9999px | Badge、状态指示器、头像 |

### 阴影（4 个 Token）

| Tailwind 类 | 用途 |
|------------|------|
| `shadow-card` | Card 静态状态 |
| `shadow-card-hover` | Card hover 状态 |
| `shadow-modal` | Dialog、下拉菜单、Popover |
| `shadow-glow` | 主色光晕（图表节点、状态高亮） |

### 过渡时长（3 档）

| Tailwind 类 | 时长 | 用途 |
|------------|------|------|
| `duration-150` | 150ms | 颜色、背景、透明度变化 |
| `duration-200` | 200ms | 阴影、边框变化 |
| `duration-300` | 300ms | 高度展开、位移动画 |

### 修改示例

如果想全局加深卡片阴影，只需修改一行：

```css
/* app/globals.css */
@theme {
  --shadow-card: 0 2px 8px 0 rgb(0 0 0 / 0.08), 0 1px 3px -1px rgb(0 0 0 / 0.06);
}
```

---

## 🎨 颜色使用规则

### 文本颜色

| 场景 | 正确 ✅ | 错误 ❌ |
|------|---------|---------|
| 页面标题 | `text-foreground` | `text-zinc-900` |
| 正文 | `text-foreground` | `text-zinc-800` |
| 次要文本 | `text-muted-foreground` | `text-zinc-500` |
| 禁用文本 | `text-muted-foreground/50` | `text-zinc-300` |

::: tip 原则
优先使用语义化 token（`foreground`、`muted-foreground`），它们在未来适配暗色模式时无需改动。
仅在纯装饰性元素（图标、分隔线）允许使用 `zinc-*`。
:::

### 背景颜色

| 场景 | 推荐写法 |
|------|---------|
| 页面背景 | `bg-background` |
| 卡片背景 | `bg-white` |
| 次要区域背景 | `bg-zinc-50` / `bg-muted/60` |
| hover 行 | `hover:bg-zinc-50/40` |
| 主色轻底色 | `bg-primary/10` |

### 边框颜色

| 场景 | 正确 ✅ | 错误 ❌ |
|------|---------|---------|
| 默认边框 | `border-border` | `border-zinc-200` |
| 弱化边框 | `border-border-subtle` | `border-zinc-100` |
| 主色强调边框 | `border-primary/20` | `border-blue-200` |

### 主色透明度梯度

| 类 | 场景 |
|----|------|
| `primary/10` | 标签底色、轻量高亮背景 |
| `primary/20` | 强调边框、焦点边框 |
| `primary/30` | 中等强调 |
| `primary/60` | 图表线条、次要图标 |
| `primary/80` | 图表节点、状态圆点 |
| `primary/90` | Button hover 态（CVA 默认值） |

---

## 🧩 组件使用规范

### Button

通过 `variant` 和 `size` 控制样式，**不要在 className 中覆盖**基础样式：

```tsx
// ✅ 正确
<Button>保存更改</Button>
<Button variant="outline" size="sm">取消</Button>
<Button variant="ghost" size="icon-sm">
  <X className="h-3.5 w-3.5" />
</Button>
<Button variant="destructive" size="sm">删除</Button>

// ❌ 错误 — 不要在 className 中复写 CVA 已定义的样式
<Button className="bg-primary text-white hover:bg-primary/90 rounded-lg">保存</Button>
```

**尺寸参考：**

| size | 高度 | 用途 |
|------|------|------|
| `sm` | h-9 | 表格操作、紧凑区域 |
| `default` | h-10 | 通用按钮 |
| `lg` | h-10 px-8 | 表单主操作（发布、保存） |
| `icon` | h-10 w-10 | 标准图标按钮 |
| `icon-sm` | h-8 w-8 | 表格行操作、面板关闭 |
| `icon-xs` | h-7 w-7 | 极紧凑图标按钮 |

### Dialog / Modal

弹窗使用 `rounded-3xl`（24px），内容区使用 `overflow-y-auto custom-scrollbar`：

```tsx
// ✅ 正确 — 遵循既有模板
<DialogPrimitive.Content className="... rounded-3xl overflow-hidden ...">
  <div className="flex-1 overflow-y-auto custom-scrollbar bg-white">
    {/* 内容 */}
  </div>
</DialogPrimitive.Content>

// ❌ 错误 — 不要自行覆盖圆角和阴影
<DialogContent className="rounded-2xl shadow-2xl">
```

### Card / 面板

Card 使用 `bg-white rounded-lg border border-border-subtle shadow-card`，不单独覆盖圆角和阴影：

```tsx
// ✅ 正确
<div className="bg-white rounded-lg border border-border-subtle shadow-card p-5">
<div className="bg-white rounded-lg border border-border-subtle shadow-card p-5 hover:shadow-card-hover transition-shadow">

// ❌ 错误
<div className="bg-white rounded-2xl shadow-xl border-zinc-200">
```

---

## ✨ 交互规范

### 允许的 hover 效果

| 效果 | 用途 |
|------|------|
| `hover:bg-*` | 所有可点击元素 |
| `hover:shadow-card-hover` | 可点击的 Card |
| `hover:text-primary` | 链接、图标按钮 |
| `hover:border-border` | 列表项边框高亮（从 border-subtle 升级） |

### 禁止的效果

| 效果 | 原因 |
|------|------|
| `hover:scale-*` | 管理后台保持克制，不使用缩放 |
| `active:scale-*` | 同上 |
| `hover:-translate-y-*` | 浮起效果过于花哨 |
| `animate-in zoom-in` | 仅用于 Modal/Dropdown 进入动画，不用于普通元素 |

### 过渡属性

```tsx
// ✅ 精确指定变化的属性
className="transition-colors"   // 仅颜色/背景变化
className="transition-shadow"   // 仅阴影变化
className="transition-opacity"  // 仅透明度变化

// ⚠️ 仅在多个属性同时变化时使用
className="transition-all"      // 颜色 + 阴影 + 边框同时变化
```

---

## 📐 页面布局规范

### 页面标题

```tsx
// 统一格式
<h1 className="text-2xl font-bold text-foreground tracking-tight">
  {title}
</h1>
<p className="text-sm text-muted-foreground mt-1 font-medium">{description}</p>
```

### Section 微标签

```tsx
// 用于表单区域标题、卡片内分组标签
<p className="label-xs">配置项</p>
// 等价于: text-2xs font-bold text-muted-foreground uppercase tracking-widest
```

### 全局 header 粘性定位

```tsx
// Header 组件已应用 glass-header，外部无需重复
// glass-header = bg-white/95 backdrop-blur-md sticky top-0 z-30
```

### 滚动容器

凡是 `overflow-y-auto` 的容器，必须加 `custom-scrollbar` 以保持统一的细滚动条样式：

```tsx
// ✅ 正确
<div className="overflow-y-auto custom-scrollbar">

// ❌ 错误
<div className="overflow-y-auto">
```

---

## ✅ 快速检查清单

新增页面/组件时，对照以下清单：

- [ ] 文本颜色使用 `text-foreground` / `text-muted-foreground`，而非 `text-zinc-*`
- [ ] 边框使用 `border-border` / `border-border-subtle`，而非 `border-zinc-200`
- [ ] Card 不自行覆盖 `rounded-*` 和 `shadow-*`
- [ ] Button 通过 `variant` + `size` 控制，不在 className 中复写 CVA 默认样式
- [ ] SVG 属性（stroke、fill、stopColor）使用 `hsl(var(--primary))` 而非硬编码十六进制
- [ ] `overflow-y-auto` 容器已添加 `custom-scrollbar`
- [ ] 无 `hover:scale-*` 或 `active:scale-*`
- [ ] `transition-*` 精确到实际变化的属性（颜色变化用 `transition-colors`，而非 `transition-all`）
- [ ] 字体大小在 5 档以内，不新增自定义 `text-[npx]`

---

## 📚 相关文档

- [前端开发指南](/guide/frontend)
- [系统架构](/guide/architecture)
