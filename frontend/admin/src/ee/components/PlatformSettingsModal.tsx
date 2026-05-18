// CE 占位：原 EE 实现是跨租户的平台管理面板。
// CE 模式下平台管理入口本身已经被 <EeOnly> gate 掉；
// 这里保留同名同 props 的空实现，让 TypeScript 在 CE 构建时不会因 prop 类型错位失败。
//
// ⚠️  Props 签名必须跟 src/ee/components/PlatformSettingsModal.tsx 一致；
//     真实组件改了 props 后，这里也要跟着改。
interface PlatformSettingsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function PlatformSettingsModal({}: PlatformSettingsModalProps) {
  return null
}
