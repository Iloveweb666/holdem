import cloud from 'wx-server-sdk'
import { Collections } from '../shared/constants'
import { AppError } from '../shared/utils/response'

const getDb = () => cloud.database()

interface JoinParams {
  openid: string
  roomId: string
  buyIn: number
}

export async function join(params: JoinParams) {
  const { openid, roomId, buyIn } = params
  const db = getDb()
  const _ = db.command

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

  // 获取房间
  const roomResult = await db.collection(Collections.ROOMS).doc(roomId).get() as any
  const room = roomResult.data as any
  if (!room || room.deletedAt) {
    throw new AppError('ROOM_NOT_FOUND', '房间不存在')
  }

  // 检查是否已在房间中
  const existingResult = await db
    .collection(Collections.ROOM_PLAYERS)
    .where({ roomId, userId: user._id })
    .limit(1)
    .get() as any

  if (existingResult.data.length > 0) {
    throw new AppError('ALREADY_IN_ROOM', '已在房间中')
  }

  // 检查房间人数
  const countResult = await db
    .collection(Collections.ROOM_PLAYERS)
    .where({ roomId })
    .count() as any

  if (countResult.total >= room.maxPlayers) {
    throw new AppError('ROOM_FULL', '房间已满')
  }

  // 验证买入
  if (buyIn < room.minBuyIn || buyIn > room.maxBuyIn) {
    throw new AppError('INVALID_BUY_IN', `买入金额应在 ${room.minBuyIn}-${room.maxBuyIn} 之间`)
  }
  if (buyIn > user.chips) {
    throw new AppError('INSUFFICIENT_CHIPS', '筹码不足')
  }

  // 加入房间（站立观战）
  await db.collection(Collections.ROOM_PLAYERS).add({
    data: {
      roomId,
      userId: user._id,
      openid,
      name: user.name,
      avatar: user.avatar,
      chips: buyIn,
      seatIndex: null,
      status: 'STANDING',
      isReady: false,
      joinedAt: db.serverDate(),
    },
  })

  // 扣除筹码
  await db.collection(Collections.USERS).doc(user._id).update({
    data: { chips: _.inc(-buyIn) },
  })

  // 返回房间和玩家列表
  const playersResult = await db
    .collection(Collections.ROOM_PLAYERS)
    .where({ roomId })
    .get() as any

  return { room, players: playersResult.data }
}
