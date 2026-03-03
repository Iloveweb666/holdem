import cloud from 'wx-server-sdk'
import { Collections } from '../../shared/constants'
import { AppError } from '../../shared/utils/response'

const db = cloud.database()

interface ReadyParams {
  openid: string
  roomId: string
  isReady: boolean
}

export async function ready(params: ReadyParams) {
  const { openid, roomId, isReady } = params

  const userResult = await db
    .collection(Collections.USERS)
    .where({ openid })
    .limit(1)
    .get()

  if (userResult.data.length === 0) {
    throw new AppError('USER_NOT_FOUND', '用户不存在')
  }
  const user = userResult.data[0]

  const playerResult = await db
    .collection(Collections.ROOM_PLAYERS)
    .where({ roomId, userId: user._id })
    .limit(1)
    .get()

  if (playerResult.data.length === 0) {
    throw new AppError('NOT_IN_ROOM', '不在房间中')
  }

  const player = playerResult.data[0]

  if ((player as any).seatIndex === null) {
    throw new AppError('NOT_SEATED', '需要先入座')
  }

  await db.collection(Collections.ROOM_PLAYERS).doc(player._id).update({
    data: { isReady },
  })

  // 检查是否所有入座玩家都已准备
  const seatedResult = await db
    .collection(Collections.ROOM_PLAYERS)
    .where({
      roomId,
      seatIndex: db.command.neq(null),
    })
    .get()

  const seated = seatedResult.data
  const allReady = seated.length >= 2 && seated.every((p: any) => p.isReady || p.userId === user._id && isReady)

  return {
    isReady,
    allReady,
    readyCount: seated.filter((p: any) =>
      p.userId === user._id ? isReady : p.isReady
    ).length,
    totalSeated: seated.length,
  }
}
