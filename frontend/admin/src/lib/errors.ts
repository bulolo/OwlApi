/**
 * 统一错误处理工具
 */

/** 从 unknown error 中安全提取消息字符串 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === "string") return error
  return "未知错误"
}

/** API 业务错误 */
export class ApiError extends Error {
  public code?: number
  public field?: string

  constructor(message: string, code?: number, field?: string) {
    super(message)
    this.name = "ApiError"
    this.code = code
    this.field = field
  }
}

/** 表单校验错误 */
export class ValidationError extends Error {
  public field: string

  constructor(message: string, field: string) {
    super(message)
    this.name = "ValidationError"
    this.field = field
  }
}
