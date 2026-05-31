// CE 占位：原 EE 实现是 SdkModal 的 "发布到 GitLab" tab 内容。
// CE 模式下主代码会通过 useSdkPublish().canPublish === false 隐藏该 tab，
// 这里的 null 仅作为编译期占位。

interface EnvLike { id: number; name: string }
interface Props {
  projectId: number
  envs: EnvLike[]
  onGoToConfig: () => void
}

export function SdkPublishModalTab({}: Props) {
  return null
}
