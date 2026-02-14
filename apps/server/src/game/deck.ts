import type { Card, Rank, Suit } from '@holdem/shared-types';

const SUITS: Suit[] = ['h', 'd', 'c', 's'];
const RANKS: Rank[] = [
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '10',
  'J',
  'Q',
  'K',
  'A',
];

/**
 * 牌组类 - 管理洗牌和发牌
 */
export class Deck {
  private cards: Card[] = [];

  constructor() {
    this.reset();
  }

  /**
   * 重置牌组（生成完整的52张牌）
   */
  reset(): void {
    this.cards = [];
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        this.cards.push(`${rank}${suit}` as Card);
      }
    }
  }

  /**
   * 洗牌 - 使用 Fisher-Yates 算法
   */
  shuffle(): void {
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
  }

  /**
   * 发牌
   * @param count 发牌数量
   * @returns 发出的牌
   */
  deal(count: number): Card[] {
    if (count > this.cards.length) {
      throw new Error(
        `Cannot deal ${count} cards, only ${this.cards.length} remaining`
      );
    }
    return this.cards.splice(0, count);
  }

  /**
   * 发一张牌
   */
  dealOne(): Card {
    const cards = this.deal(1);
    return cards[0];
  }

  /**
   * 剩余牌数
   */
  get remaining(): number {
    return this.cards.length;
  }

  /**
   * 销毁一张牌（烧牌）
   */
  burn(): void {
    if (this.cards.length > 0) {
      this.cards.shift();
    }
  }
}

/**
 * 解析牌面字符串
 */
export function parseCard(card: Card): { rank: Rank; suit: Suit } {
  const suit = card.slice(-1) as Suit;
  const rank = card.slice(0, -1) as Rank;
  return { rank, suit };
}

/**
 * 获取牌面数值（用于比较大小）
 */
export function getRankValue(rank: Rank): number {
  const values: Record<Rank, number> = {
    '2': 2,
    '3': 3,
    '4': 4,
    '5': 5,
    '6': 6,
    '7': 7,
    '8': 8,
    '9': 9,
    '10': 10,
    J: 11,
    Q: 12,
    K: 13,
    A: 14,
  };
  return values[rank];
}

/**
 * 获取花色名称
 */
export function getSuitName(suit: Suit): string {
  const names: Record<Suit, string> = {
    h: 'hearts',
    d: 'diamonds',
    c: 'clubs',
    s: 'spades',
  };
  return names[suit];
}
