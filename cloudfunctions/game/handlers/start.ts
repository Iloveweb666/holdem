import cloud from 'wx-server-sdk'
import { Collections } from '../../shared/constants'
import { AppError } from '../../shared/utils/response'
import { GameEngine } from '../engine/GameEngine'

const db = cloud.database()

interface StartParams {
  openid: string
  roomId: string
}

export async function start(params: StartParams) {
  const { openid, roomId } = params

  // 获取房间
  const roomResult = await db.collection(Collections.ROOMS).doc(roomId).get()
  const room = roomResult.data as any
  if (!room || room.deletedAt) {
    throw new AppError('ROOM_NOT_FOUND', '房间不存在')
  }

  // 验证是否为房主
  const userResult = await db
    .collection(Collections.USERS)
    .where({ openid })
    .limit(1)
    .get()

  if (userResult.data.length === 0) {
    throw new AppError('USER_NOT_FOUND', '用户不存在')
  }
  const user = userResult.data[0]

  if (user._id !== room.ownerId) {
    throw new AppError('NOT_ROOM_OWNER', '只有房主可以开始游戏')
  }

  if (room.status === 'PLAYING') {
    throw new AppError('GAME_ALREADY_STARTED', '游戏已在进行中')
  }

  // 获取入座玩家（seatIndex 不为 null）
  const playersResult = await db
    .collection(Collections.ROOM_PLAYERS)
    .where({
      roomId,
      seatIndex: db.command.neq(null),
    })
    .get()

  const seatedPlayers = playersResult.data.sort(
    (a: any, b: any) => a.seatIndex - b.seatIndex
  )

  if (seatedPlayers.length < 2) {
    throw new AppError('NOT_ENOUGH_PLAYERS', '至少需要 2 名玩家入座')
  }

  // 计算局数（用于轮换庄家）
  const gameCountResult = await db
    .collection(Collections.GAMES)
    .where({ roomId })
    .count()

  const roundNumber = gameCountResult.total + 1
  const dealerIndex = (roundNumber - 1) % seatedPlayers.length

  // 初始化游戏引擎
  const engine = new GameEngine(room.smallBlind, room.bigBlind)
  engine.initialize(
    seatedPlayers.map((p: any) => ({
      userId: p.userId,
      seatIndex: p.seatIndex,
      chips: p.chips,
    })),
    dealerIndex
  )

  const publicState = engine.getPublicState()

  // 保存游戏状态
  const gameResult = await db.collection(Collections.GAMES).add({
    data: {
      roomId,
      roundNumber,
      ...publicState,
      createdAt: db.serverDate(),
      updatedAt: db.serverDate(),
    },
  })

  const gameId = gameResult._id as string

  // 保存每个玩家的私牌（单独集合，安全隔离）
  for (const sp of seatedPlayers) {
    const cards = engine.getPlayerCards(sp.userId)
    await db.collection(Collections.PLAYER_CARDS).add({
      data: {
        gameId,
        userId: sp.userId,
        openid: sp.openid,
        cards,
      },
    })
  }

  // 更新房间状态
  await db.collection(Collections.ROOMS).doc(roomId).update({
    data: {
      status: 'PLAYING',
      currentGameId: gameId,
      updatedAt: db.serverDate(),
    },
  })

  // 更新玩家状态为 PLAYING
  for (const sp of seatedPlayers) {
    await db.collection(Collections.ROOM_PLAYERS).doc(sp._id).update({
      data: { status: 'PLAYING' },
    })
  }

  return { gameId }
}
