# EE → CE 占位（stubs）

`make sync-ce` 流程：

1. `rm -rf frontend/admin/src/ee`
2. 把本目录里的所有文件拷回 `frontend/admin/src/ee/`

效果：CE 构建时 `import "@/ee/..."` 仍然能解析到一个无副作用的空实现，
build 不会失败。

## 维护规则

- 每新增一个 EE 文件 `src/ee/<path>/Foo.tsx`，必须在 `_ce_stubs/<path>/Foo.tsx`
  添加同名同导出的空实现
- 默认导出 `null` 或返回空对象的纯函数
- 不要在 stub 里引用其他 EE 文件（CE 模式下根本不存在），只引用 CE 也有的依赖

## 示例

EE 真实文件 `src/ee/components/PlatformAdmin.tsx`：
```tsx
export function PlatformAdmin() { return <div>跨租户管理面板</div> }
```

对应 stub `_ce_stubs/components/PlatformAdmin.tsx`：
```tsx
export function PlatformAdmin() { return null }
```
