import cloud from 'wx-server-sdk'
import { Collections } from '../shared/constants'
import { AppError } from '../shared/utils/response'

const getDb = () => cloud.database()

interface StandParams {
  openid: string
  roomId: string
}

export async function stand(params: StandParams) {
  const { openid, roomId } = params
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

  const playerResult = await db
    .collection(Collections.ROOM_PLAYERS)
    .where({ roomId, userId: user._id })
    .limit(1)
    .get() as any

  if (playerResult.data.length === 0) {
    throw new AppError('NOT_IN_ROOM', '不在房间中')
  }

  const player = playerResult.data[0]

  if (player.seatIndex === null) {
    throw new AppError('NOT_SEATED', '未入座')
  }

  if (player.status === 'PLAYING') {
    throw new AppError('GAME_IN_PROGRESS', '游戏进行中不能离席')
  }

  await db.collection(Collections.ROOM_PLAYERS).doc(player._id).update({
    data: {
      seatIndex: null,
      status: 'STANDING',
      isReady: false,
    },
  })

  return { success: true }
}
