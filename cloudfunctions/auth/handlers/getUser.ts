import cloud from 'wx-server-sdk'
import { Collections } from '../shared/constants'
import { AppError } from '../shared/utils/response'

const getDb = () => cloud.database()

interface GetUserParams {
  openid: string
}

export async function getUser(params: GetUserParams) {
  const { openid } = params
  const db = getDb()

  const userResult = await db
    .collection(Collections.USERS)
    .where({ openid })
    .limit(1)
    .get() as any

  if (userResult.data.length === 0) {
    throw new AppError('USER_NOT_FOUND', '用户不存在')
  }

  const user = userResult.data[0]

  // 获取统计
  const statsResult = await db
    .collection(Collections.USER_STATISTICS)
    .where({ userId: user._id })
    .limit(1)
    .get() as any

  return {
    user,
    statistics: statsResult.data[0] || null,
  }
}
