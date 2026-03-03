import cloud from 'wx-server-sdk'
import { login } from './handlers/login'
import { getUser } from './handlers/getUser'

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV as any })

const handlers: Record<string, Function> = {
  login,
  getUser,
}

export async function main(event: any, context: any) {
  const { action, ...data } = event
  const { OPENID } = cloud.getWXContext()

  const handler = handlers[action]
  if (!handler) {
    return { error: { code: 'INVALID_ACTION', message: `Unknown action: ${action}` } }
  }

  try {
    const result = await handler({ ...data, openid: OPENID }, context)
    return { data: result }
  } catch (err: any) {
    console.error(`[auth:${action}] Error:`, err)
    return {
      error: {
        code: err.code || 'INTERNAL_ERROR',
        message: err.message || '服务器内部错误',
      },
    }
  }
}
