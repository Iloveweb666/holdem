import type { Card } from '../../shared/types/game'

export enum HandRank {
  HIGH_CARD = 1,
  ONE_PAIR = 2,
  TWO_PAIR = 3,
  THREE_OF_A_KIND = 4,
  STRAIGHT = 5,
  FLUSH = 6,
  FULL_HOUSE = 7,
  FOUR_OF_A_KIND = 8,
  STRAIGHT_FLUSH = 9,
  ROYAL_FLUSH = 10,
}

const HAND_NAMES: Record<HandRank, string> = {
  [HandRank.HIGH_CARD]: '高牌',
  [HandRank.ONE_PAIR]: '一对',
  [HandRank.TWO_PAIR]: '两对',
  [HandRank.THREE_OF_A_KIND]: '三条',
  [HandRank.STRAIGHT]: '顺子',
  [HandRank.FLUSH]: '同花',
  [HandRank.FULL_HOUSE]: '葫芦',
  [HandRank.FOUR_OF_A_KIND]: '四条',
  [HandRank.STRAIGHT_FLUSH]: '同花顺',
  [HandRank.ROYAL_FLUSH]: '皇家同花顺',
}

export interface HandResult {
  rank: HandRank
  name: string
  bestCards: Card[]
  score: number
}

const RANK_VALUES: Record<string, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8,
  '9': 9, 'T': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14,
}

export class HandEvaluator {
  /** 从 7 张牌中找到最佳 5 张牌组合 */
  evaluate(holeCards: Card[], communityCards: Card[]): HandResult {
    const allCards = [...holeCards, ...communityCards]
    const combos = this.combinations(allCards, 5)

    let best: HandResult | null = null
    for (const combo of combos) {
      const result = this.evaluateFive(combo)
      if (!best || result.score > best.score) {
        best = result
      }
    }

    return best!
  }

  /** 比较两手牌，返回 1 / -1 / 0 */
  compare(a: HandResult, b: HandResult): number {
    return Math.sign(a.score - b.score)
  }

  // ─── 内部方法 ──────────────────────────────────────

  private evaluateFive(cards: Card[]): HandResult {
    const suits = cards.map((c) => c[1])
    const rankChars = cards.map((c) => c[0])
    const values = rankChars.map((r) => RANK_VALUES[r]).sort((a, b) => b - a)

    const isFlush = suits.every((s) => s === suits[0])
    const isStraight = this.isStraight(values)

    const counts = this.countValues(values)
    const groups = Object.entries(counts).sort((a, b) => {
      // 先按数量降序，再按点数降序
      if (b[1] !== a[1]) return b[1] - a[1]
      return RANK_VALUES[b[0]] - RANK_VALUES[a[0]]
    })
    const pattern = groups.map(([, c]) => c)

    let rank: HandRank

    if (isFlush && isStraight) {
      rank = values[0] === 14 && values[1] === 13
        ? HandRank.ROYAL_FLUSH
        : HandRank.STRAIGHT_FLUSH
    } else if (pattern[0] === 4) {
      rank = HandRank.FOUR_OF_A_KIND
    } else if (pattern[0] === 3 && pattern[1] === 2) {
      rank = HandRank.FULL_HOUSE
    } else if (isFlush) {
      rank = HandRank.FLUSH
    } else if (isStraight) {
      rank = HandRank.STRAIGHT
    } else if (pattern[0] === 3) {
      rank = HandRank.THREE_OF_A_KIND
    } else if (pattern[0] === 2 && pattern[1] === 2) {
      rank = HandRank.TWO_PAIR
    } else if (pattern[0] === 2) {
      rank = HandRank.ONE_PAIR
    } else {
      rank = HandRank.HIGH_CARD
    }

    return {
      rank,
      name: HAND_NAMES[rank],
      bestCards: cards,
      score: this.calculateScore(rank, groups),
    }
  }

  private isStraight(sortedDesc: number[]): boolean {
    // 普通顺子
    let straight = true
    for (let i = 0; i < sortedDesc.length - 1; i++) {
      if (sortedDesc[i] - sortedDesc[i + 1] !== 1) {
        straight = false
        break
      }
    }
    if (straight) return true

    // A-2-3-4-5 (轮顺)
    const sorted = [...sortedDesc].sort((a, b) => a - b)
    if (
      sorted[0] === 2 &&
      sorted[1] === 3 &&
      sorted[2] === 4 &&
      sorted[3] === 5 &&
      sorted[4] === 14
    ) {
      return true
    }

    return false
  }

  private countValues(values: number[]): Record<string, number> {
    const counts: Record<string, number> = {}
    for (const v of values) {
      counts[v] = (counts[v] || 0) + 1
    }
    return counts
  }

  /**
   * 计算综合分数用于比较同级牌型
   * 高位为牌型等级，低位为踢脚牌排序
   */
  private calculateScore(rank: HandRank, groups: [string, number][]): number {
    let score = rank * 100_000_000

    // groups 已按(数量降序, 点数降序)排列
    // 依次加入分数，权重递减
    for (let i = 0; i < groups.length; i++) {
      const value = Number(groups[i][0])
      score += value * Math.pow(15, groups.length - 1 - i)
    }

    return score
  }

  /** 从数组中选取 size 个元素的所有组合 */
  private combinations<T>(arr: T[], size: number): T[][] {
    const result: T[][] = []

    const backtrack = (start: number, current: T[]) => {
      if (current.length === size) {
        result.push([...current])
        return
      }
      for (let i = start; i < arr.length; i++) {
        current.push(arr[i])
        backtrack(i + 1, current)
        current.pop()
      }
    }

    backtrack(0, [])
    return result
  }
}
