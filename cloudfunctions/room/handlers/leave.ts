import cloud from 'wx-server-sdk'
import { Collections } from '../shared/constants'
import { AppError } from '../shared/utils/response'

const getDb = () => cloud.database()

interface LeaveParams {
  openid: string
  roomId: string
}

export async function leave(params: LeaveParams) {
  const { openid, roomId } = params
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

  // 不允许游戏中离开
  if (player.status === 'PLAYING') {
    throw new AppError('GAME_IN_PROGRESS', '游戏进行中不能离开')
  }

  // 退还筹码
  await db.collection(Collections.USERS).doc(user._id).update({
    data: { chips: _.inc(player.chips) },
  })

  // 删除玩家记录
  await db.collection(Collections.ROOM_PLAYERS).doc(player._id).remove()

  // 检查房间是否还有人
  const remainingResult = await db
    .collection(Collections.ROOM_PLAYERS)
    .where({ roomId })
    .count() as any

  if (remainingResult.total === 0) {
    // 房间没人了，软删除
    await db.collection(Collections.ROOMS).doc(roomId).update({
      data: {
        status: 'FINISHED',
        deletedAt: db.serverDate(),
        updatedAt: db.serverDate(),
      },
    })
  } else if (player.userId === (await getRoomOwnerId(roomId))) {
    // 如果离开的是房主，转移房主给下一个玩家
    const nextPlayer = await db
      .collection(Collections.ROOM_PLAYERS)
      .where({ roomId })
      .limit(1)
      .get() as any

    if (nextPlayer.data.length > 0) {
      await db.collection(Collections.ROOMS).doc(roomId).update({
        data: {
          ownerId: nextPlayer.data[0].userId,
          updatedAt: db.serverDate(),
        },
      })
    }
  }

  return { refundChips: player.chips }
}

async function getRoomOwnerId(roomId: string): Promise<string> {
  const db = getDb()
  const roomResult = await db.collection(Collections.ROOMS).doc(roomId).get() as any
  return (roomResult.data as any).ownerId
}
