import cloud from 'wx-server-sdk'
import { Collections } from '../../shared/constants'
import { AppError } from '../../shared/utils/response'

const db = cloud.database()

interface GetMyCardsParams {
  openid: string
  gameId: string
}

/** 获取当前玩家的私牌 */
export async function getMyCards(params: GetMyCardsParams) {
  const { openid, gameId } = params

  const userResult = await db
    .collection(Collections.USERS)
    .where({ openid })
    .limit(1)
    .get()

  if (userResult.data.length === 0) {
    throw new AppError('USER_NOT_FOUND', '用户不存在')
  }
  const user = userResult.data[0]

  const cardsResult = await db
    .collection(Collections.PLAYER_CARDS)
    .where({
      gameId,
      userId: user._id,
    })
    .limit(1)
    .get()

  if (cardsResult.data.length === 0) {
    return { cards: [] }
  }

  return { cards: (cardsResult.data[0] as any).cards }
}
