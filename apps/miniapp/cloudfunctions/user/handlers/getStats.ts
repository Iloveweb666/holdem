import cloud from 'wx-server-sdk'
import { Collections } from '../shared/constants'
import { AppError } from '../shared/utils/response'

const getDb = () => cloud.database()

interface GetStatsParams {
  openid: string
}

export async function getStats(params: GetStatsParams) {
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

  const statsResult = await db
    .collection(Collections.USER_STATISTICS)
    .where({ userId: user._id })
    .limit(1)
    .get() as any

  const stats = statsResult.data[0]

  return {
    chips: user.chips,
    totalGames: stats?.totalGames || 0,
    wins: stats?.wins || 0,
    winRate: stats?.totalGames
      ? Math.round((stats.wins / stats.totalGames) * 100)
      : 0,
    totalWinnings: stats?.totalWinnings || 0,
    totalLosses: stats?.totalLosses || 0,
    biggestWin: stats?.biggestWin || 0,
    biggestLoss: stats?.biggestLoss || 0,
  }
}
