import cloud from 'wx-server-sdk'
import { Collections } from '../shared/constants'
import { AppError } from '../shared/utils/response'

const getDb = () => cloud.database()

interface GetHistoryParams {
  openid: string
  page?: number
  limit?: number
  result?: 'win' | 'lose'
}

export async function getHistory(params: GetHistoryParams) {
  const { openid, page = 1, limit = 20, result } = params
  const db = getDb()

  const pageSize = Math.min(limit, 50)
  const skip = (page - 1) * pageSize

  const where: Record<string, any> = { openid }
  if (result) {
    where.result = result
  }

  const [listResult, countResult] = await Promise.all([
    db
      .collection(Collections.GAME_HISTORY)
      .where(where)
      .orderBy('playedAt', 'desc')
      .skip(skip)
      .limit(pageSize)
      .get() as any,
    db
      .collection(Collections.GAME_HISTORY)
      .where(where)
      .count() as any,
  ])

  return {
    list: (listResult as any).data,
    pagination: {
      page,
      limit: pageSize,
      total: countResult.total,
    },
  }
}
