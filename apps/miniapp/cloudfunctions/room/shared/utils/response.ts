/** 云函数成功响应 */
export function success<T>(data: T) {
  return { data }
}

/** 云函数错误响应 */
export function error(code: string, message: string) {
  return { error: { code, message } }
}

/** 业务异常 */
export class AppError extends Error {
  code: string
  constructor(code: string, message: string) {
    super(message)
    this.code = code
  }
}
