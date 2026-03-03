import type { Card, Suit, Rank } from '../../shared/types/game'

const SUITS: Suit[] = ['h', 'd', 'c', 's']
const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A']

export class Deck {
  private cards: Card[] = []

  constructor() {
    this.reset()
  }

  reset(): void {
    this.cards = []
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        this.cards.push(`${rank}${suit}` as Card)
      }
    }
  }

  /** Fisher-Yates 洗牌 */
  shuffle(): void {
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]]
    }
  }

  /** 从牌堆顶取 count 张牌 */
  deal(count: number = 1): Card[] {
    if (count > this.cards.length) {
      throw new Error('Not enough cards in deck')
    }
    return this.cards.splice(0, count)
  }

  get remaining(): number {
    return this.cards.length
  }
}
