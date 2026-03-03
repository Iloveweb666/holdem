import type { HandResult } from './HandEvaluator'

interface PotPlayer {
  userId: string
  totalBet: number
  hand: HandResult | null // null = 已弃牌
}

export interface PotDistribution {
  userId: string
  amount: number
  hand: HandResult | null
}

export class PotCalculator {
  /**
   * 计算底池分配（支持边池）
   *
   * 1. 按 totalBet 升序排列
   * 2. 逐层计算边池
   * 3. 每个边池分配给该层中牌最大的玩家
   */
  distribute(players: PotPlayer[]): PotDistribution[] {
    const activePlayers = players.filter((p) => p.hand !== null)
    const allPlayers = [...players].sort((a, b) => a.totalBet - b.totalBet)

    const winnings: Record<string, number> = {}
    for (const p of players) {
      winnings[p.userId] = 0
    }

    let processed = 0

    for (let i = 0; i < allPlayers.length; i++) {
      const currentBet = allPlayers[i].totalBet
      if (currentBet <= processed) continue

      const layer = currentBet - processed
      let potForThisLayer = 0

      // 计算这一层的底池：每个玩家贡献 min(layer, 其剩余bet)
      for (const p of allPlayers) {
        const contribution = Math.min(layer, Math.max(0, p.totalBet - processed))
        potForThisLayer += contribution
      }

      // 找出这层有资格争夺的玩家（未弃牌且 totalBet >= currentBet）
      const eligible = activePlayers.filter((p) => p.totalBet >= currentBet)

      if (eligible.length > 0) {
        // 找最大牌
        let bestScore = -1
        const winners: string[] = []

        for (const p of eligible) {
          if (p.hand!.score > bestScore) {
            bestScore = p.hand!.score
            winners.length = 0
            winners.push(p.userId)
          } else if (p.hand!.score === bestScore) {
            winners.push(p.userId) // 平分
          }
        }

        // 分配
        const share = Math.floor(potForThisLayer / winners.length)
        const remainder = potForThisLayer - share * winners.length

        for (let w = 0; w < winners.length; w++) {
          winnings[winners[w]] += share + (w === 0 ? remainder : 0)
        }
      }

      processed = currentBet
    }

    return players.map((p) => ({
      userId: p.userId,
      amount: winnings[p.userId],
      hand: p.hand,
    }))
  }
}
