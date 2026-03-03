import cloud from 'wx-server-sdk'
import { list } from './handlers/list'
import { create } from './handlers/create'
import { join } from './handlers/join'
import { leave } from './handlers/leave'
import { sit } from './handlers/sit'
import { stand } from './handlers/stand'

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV as any })

const handlers: Record<string, Function> = {
  list,
  create,
  join,
  leave,
  sit,
  stand,
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
    console.error(`[room:${action}] Error:`, err)
    return {
      error: {
        code: err.code || 'INTERNAL_ERROR',
        message: err.message || '服务器内部错误',
      },
    }
  }
}
