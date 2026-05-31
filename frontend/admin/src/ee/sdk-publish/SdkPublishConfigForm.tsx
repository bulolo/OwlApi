// CE 占位：原 EE 实现是 SDK 发布到 GitLab 的配置表单。
// CE 不暴露发布功能，组件返回 null。
// Props 签名必须跟 src/ee/sdk-publish/SdkPublishConfigForm.tsx 一致。

interface Props {
  projectId: number
}

export function SdkPublishConfigForm({}: Props) {
  return null
}
