import cloud from 'wx-server-sdk'
import { Collections, MAX_PLAYERS } from '../shared/constants'
import { AppError } from '../shared/utils/response'

const getDb = () => cloud.database()

interface SitParams {
  openid: string
  roomId: string
  seatIndex: number
}

export async function sit(params: SitParams) {
  const { openid, roomId, seatIndex } = params
  const db = getDb()

  // 校验座位号
  if (seatIndex < 0 || seatIndex >= MAX_PLAYERS) {
    throw new AppError('INVALID_SEAT', `座位号应在 0-${MAX_PLAYERS - 1} 之间`)
  }

  // 获取用户
  const userResult = await db
    .collection(Collections.USERS)
    .where({ openid })
    .limit(1)
    .get() as any

  if (userResult.data.length === 0) {
    throw new AppError('USER_NOT_FOUND', '用户不存在')
  }
  const user = userResult.data[0]

  // 获取玩家记录
  const playerResult = await db
    .collection(Collections.ROOM_PLAYERS)
    .where({ roomId, userId: user._id })
    .limit(1)
    .get() as any

  if (playerResult.data.length === 0) {
    throw new AppError('NOT_IN_ROOM', '不在房间中')
  }

  const player = playerResult.data[0]

  if (player.seatIndex !== null) {
    throw new AppError('ALREADY_SEATED', '已经入座')
  }

  // 检查座位是否已被占
  const seatResult = await db
    .collection(Collections.ROOM_PLAYERS)
    .where({ roomId, seatIndex })
    .limit(1)
    .get() as any

  if (seatResult.data.length > 0) {
    throw new AppError('SEAT_TAKEN', '座位已被占用')
  }

  // 入座
  await db.collection(Collections.ROOM_PLAYERS).doc(player._id).update({
    data: {
      seatIndex,
      status: 'SEATED',
    },
  })

  return { seatIndex }
}
