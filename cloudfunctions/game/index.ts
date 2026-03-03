import cloud from 'wx-server-sdk'
import { start } from './handlers/start'
import { action } from './handlers/action'
import { ready } from './handlers/ready'
import { getMyCards } from './handlers/getMyCards'

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const handlers: Record<string, Function> = {
  start,
  action,
  ready,
  getMyCards,
}

export async function main(event: any, context: any) {
  const { action: actionName, ...data } = event
  const { OPENID } = cloud.getWXContext()

  const handler = handlers[actionName]
  if (!handler) {
    return { error: { code: 'INVALID_ACTION', message: `Unknown action: ${actionName}` } }
  }

  try {
    const result = await handler({ ...data, openid: OPENID }, context)
    return { data: result }
  } catch (err: any) {
    console.error(`[game:${actionName}] Error:`, err)
    return {
      error: {
        code: err.code || 'INTERNAL_ERROR',
        message: err.message || '服务器内部错误',
      },
    }
  }
}
