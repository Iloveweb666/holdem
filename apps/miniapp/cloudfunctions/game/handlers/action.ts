import cloud from 'wx-server-sdk'
import { Collections } from '../../shared/constants'
import { AppError } from '../../shared/utils/response'
import { GameEngine } from '../engine/GameEngine'
import type { GameAction, Card } from '../../shared/types/game'

const db = cloud.database()
const _ = db.command

interface ActionParams {
  openid: string
  roomId: string
  gameAction: GameAction
  amount?: number
}

export async function action(params: ActionParams) {
  const { openid, roomId, gameAction, amount } = params

  // 获取房间
  const roomResult = await db.collection(Collections.ROOMS).doc(roomId).get()
  const room = roomResult.data as any
  if (!room?.currentGameId) {
    throw new AppError('NO_ACTIVE_GAME', '没有进行中的游戏')
  }

  // 获取用户
  const userResult = await db
    .collection(Collections.USERS)
    .where({ openid })
    .limit(1)
    .get()

  if (userResult.data.length === 0) {
    throw new AppError('USER_NOT_FOUND', '用户不存在')
  }
  const user = userResult.data[0]

  // 获取当前游戏状态
  const gameResult = await db
    .collection(Collections.GAMES)
    .doc(room.currentGameId)
    .get()

  const game = gameResult.data as any

  // 获取所有玩家的私牌（引擎需要用来结算）
  const cardsResult = await db
    .collection(Collections.PLAYER_CARDS)
    .where({ gameId: room.currentGameId })
    .get()

  const playerCardsMap = new Map<string, Card[]>()
  for (const pc of cardsResult.data) {
    playerCardsMap.set((pc as any).userId, (pc as any).cards)
  }

  // 重建引擎
  const engine = new GameEngine(room.smallBlind, room.bigBlind)
  engine.loadState(game, playerCardsMap)

  // 执行操作
  engine.performAction(user._id, gameAction, amount)

  const publicState = engine.getPublicState()

  // 如果游戏结束 → 结算
  if (publicState.isEnded) {
    const results = engine.getResults()
    publicState.results = results

    await settleGame(room.currentGameId, roomId, room.name, results, game.players)
  }

  // 更新游戏状态
  await db.collection(Collections.GAMES).doc(room.currentGameId).update({
    data: {
      ...publicState,
      updatedAt: db.serverDate(),
      ...(publicState.isEnded ? { endedAt: db.serverDate() } : {}),
    },
  })

  return { game: publicState }
}

/** 结算：更新筹码、记录历史、更新统计 */
async function settleGame(
  gameId: string,
  roomId: string,
  roomName: string,
  results: any[],
  gamePlayers: any[]
) {
  // 获取房间玩家记录
  const rpResult = await db
    .collection(Collections.ROOM_PLAYERS)
    .where({ roomId })
    .get()

  const roomPlayers = rpResult.data

  for (const result of results) {
    const netGain = result.chipsWon - result.chipsLost
    const rp = roomPlayers.find((p: any) => p.userId === result.userId)
    if (!rp) continue

    // 更新房间内玩家筹码
    await db.collection(Collections.ROOM_PLAYERS).doc((rp as any)._id).update({
      data: {
        chips: _.inc(netGain),
        status: 'SEATED',
        isReady: false,
      },
    })

    // 写入游戏历史
    await db.collection(Collections.GAME_HISTORY).add({
      data: {
        gameId,
        roomId,
        roomName,
        userId: result.userId,
        openid: (rp as any).openid,
        result: result.isWinner ? 'win' : 'lose',
        chipsChange: netGain,
        handRank: result.handRank,
        playedAt: db.serverDate(),
      },
    })

    // 更新用户统计
    const statsUpdate: Record<string, any> = {
      totalGames: _.inc(1),
      updatedAt: db.serverDate(),
    }
    if (result.isWinner) {
      statsUpdate.wins = _.inc(1)
      statsUpdate.totalWinnings = _.inc(result.chipsWon)
    } else {
      statsUpdate.totalLosses = _.inc(result.chipsLost)
    }

    const statsResult = await db
      .collection(Collections.USER_STATISTICS)
      .where({ userId: result.userId })
      .limit(1)
      .get()

    if (statsResult.data.length > 0) {
      const stats = statsResult.data[0] as any

      if (result.isWinner && result.chipsWon > (stats.biggestWin || 0)) {
        statsUpdate.biggestWin = result.chipsWon
      }
      if (!result.isWinner && result.chipsLost > (stats.biggestLoss || 0)) {
        statsUpdate.biggestLoss = result.chipsLost
      }

      await db
        .collection(Collections.USER_STATISTICS)
        .doc(stats._id)
        .update({ data: statsUpdate })
    }
  }

  // 更新房间状态回 WAITING
  await db.collection(Collections.ROOMS).doc(roomId).update({
    data: {
      status: 'WAITING',
      updatedAt: db.serverDate(),
    },
  })
}
