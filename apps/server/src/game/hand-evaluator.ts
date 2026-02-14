import type { Card, Rank, Suit } from '@holdem/shared-types';
import { parseCard, getRankValue } from './deck.js';

/**
 * 牌型等级（从高到低）
 */
export enum HandRanking {
  ROYAL_FLUSH = 10, // 皇家同花顺
  STRAIGHT_FLUSH = 9, // 同花顺
  FOUR_OF_A_KIND = 8, // 四条
  FULL_HOUSE = 7, // 葫芦
  FLUSH = 5, // 同花
  STRAIGHT = 4, // 顺子
  THREE_OF_A_KIND = 3, // 三条
  TWO_PAIR = 2, // 两对
  ONE_PAIR = 1, // 一对
  HIGH_CARD = 0, // 高牌
}

/**
 * 牌型评估结果
 */
export interface HandResult {
  ranking: HandRanking;
  rankingName: string;
  cards: Card[]; // 组成该牌型的5张牌
  kickers: number[]; // 用于比较的踢脚牌数值（从大到小）
  score: number; // 综合评分（用于快速比较）
}

/**
 * 解析的牌面信息
 */
interface ParsedCard {
  card: Card;
  rank: Rank;
  suit: Suit;
  value: number;
}

/**
 * 评估最佳5张牌
 * @param holeCards 底牌（2张）
 * @param communityCards 公共牌（3-5张）
 * @returns 最佳牌型评估结果
 */
export function evaluateHand(
  holeCards: Card[],
  communityCards: Card[]
): HandResult {
  const allCards = [...holeCards, ...communityCards];

  if (allCards.length < 5) {
    throw new Error('Need at least 5 cards to evaluate a hand');
  }

  // 生成所有可能的5张牌组合
  const combinations = getCombinations(allCards, 5);

  // 评估每个组合并找出最佳
  let bestHand: HandResult | null = null;

  for (const combo of combinations) {
    const result = evaluateFiveCards(combo);
    if (!bestHand || result.score > bestHand.score) {
      bestHand = result;
    }
  }

  return bestHand!;
}

/**
 * 评估5张牌的牌型
 */
function evaluateFiveCards(cards: Card[]): HandResult {
  const parsed = cards
    .map((card) => {
      const { rank, suit } = parseCard(card);
      return { card, rank, suit, value: getRankValue(rank) };
    })
    .sort((a, b) => b.value - a.value);

  // 检查同花
  const isFlush = parsed.every((c) => c.suit === parsed[0].suit);

  // 检查顺子
  const straightResult = checkStraight(parsed);
  const isStraight = straightResult.isStraight;

  // 统计每个点数的数量
  const rankCounts = new Map<number, ParsedCard[]>();
  for (const c of parsed) {
    if (!rankCounts.has(c.value)) {
      rankCounts.set(c.value, []);
    }
    rankCounts.get(c.value)!.push(c);
  }

  // 按数量排序
  const groups = Array.from(rankCounts.entries()).sort((a, b) => {
    // 先按数量，再按点数
    if (b[1].length !== a[1].length) {
      return b[1].length - a[1].length;
    }
    return b[0] - a[0];
  });

  const counts = groups.map((g) => g[1].length);

  // 判断牌型
  if (isFlush && isStraight) {
    if (straightResult.highCard === 14) {
      return createResult(
        HandRanking.ROYAL_FLUSH,
        '皇家同花顺',
        cards,
        [14],
        straightResult.highCard
      );
    }
    return createResult(
      HandRanking.STRAIGHT_FLUSH,
      '同花顺',
      cards,
      [straightResult.highCard],
      straightResult.highCard
    );
  }

  if (counts[0] === 4) {
    const quadValue = groups[0][0];
    const kicker = groups[1][0];
    return createResult(
      HandRanking.FOUR_OF_A_KIND,
      '四条',
      cards,
      [quadValue, kicker],
      quadValue
    );
  }

  if (counts[0] === 3 && counts[1] === 2) {
    const tripValue = groups[0][0];
    const pairValue = groups[1][0];
    return createResult(
      HandRanking.FULL_HOUSE,
      '葫芦',
      cards,
      [tripValue, pairValue],
      tripValue
    );
  }

  if (isFlush) {
    const kickers = parsed.map((c) => c.value);
    return createResult(HandRanking.FLUSH, '同花', cards, kickers, kickers[0]);
  }

  if (isStraight) {
    return createResult(
      HandRanking.STRAIGHT,
      '顺子',
      cards,
      [straightResult.highCard],
      straightResult.highCard
    );
  }

  if (counts[0] === 3) {
    const tripValue = groups[0][0];
    const kickers = groups
      .slice(1)
      .map((g) => g[0])
      .slice(0, 2);
    return createResult(
      HandRanking.THREE_OF_A_KIND,
      '三条',
      cards,
      [tripValue, ...kickers],
      tripValue
    );
  }

  if (counts[0] === 2 && counts[1] === 2) {
    const highPair = groups[0][0];
    const lowPair = groups[1][0];
    const kicker = groups[2][0];
    return createResult(
      HandRanking.TWO_PAIR,
      '两对',
      cards,
      [highPair, lowPair, kicker],
      highPair
    );
  }

  if (counts[0] === 2) {
    const pairValue = groups[0][0];
    const kickers = groups
      .slice(1)
      .map((g) => g[0])
      .slice(0, 3);
    return createResult(
      HandRanking.ONE_PAIR,
      '一对',
      cards,
      [pairValue, ...kickers],
      pairValue
    );
  }

  // 高牌
  const kickers = parsed.map((c) => c.value);
  return createResult(
    HandRanking.HIGH_CARD,
    '高牌',
    cards,
    kickers,
    kickers[0]
  );
}

/**
 * 检查是否为顺子
 */
function checkStraight(parsed: ParsedCard[]): {
  isStraight: boolean;
  highCard: number;
} {
  const values = parsed.map((c) => c.value);

  // 普通顺子检查
  let isSequential = true;
  for (let i = 0; i < values.length - 1; i++) {
    if (values[i] - values[i + 1] !== 1) {
      isSequential = false;
      break;
    }
  }

  if (isSequential) {
    return { isStraight: true, highCard: values[0] };
  }

  // A-2-3-4-5 小顺子（轮子）
  if (
    values[0] === 14 &&
    values[1] === 5 &&
    values[2] === 4 &&
    values[3] === 3 &&
    values[4] === 2
  ) {
    return { isStraight: true, highCard: 5 }; // A作为1，最大是5
  }

  return { isStraight: false, highCard: 0 };
}

/**
 * 创建评估结果
 */
function createResult(
  ranking: HandRanking,
  rankingName: string,
  cards: Card[],
  kickers: number[],
  primaryValue: number
): HandResult {
  // 计算综合评分
  // ranking * 10^10 + kickers (每个占2位)
  let score = ranking * 10000000000;
  for (let i = 0; i < kickers.length; i++) {
    score += kickers[i] * Math.pow(100, 4 - i);
  }

  return {
    ranking,
    rankingName,
    cards,
    kickers,
    score,
  };
}

/**
 * 比较两手牌的大小
 * @returns 正数表示hand1赢，负数表示hand2赢，0表示平局
 */
export function compareHands(hand1: HandResult, hand2: HandResult): number {
  return hand1.score - hand2.score;
}

/**
 * 获取数组的所有组合
 */
function getCombinations<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];

  function combine(start: number, combo: T[]): void {
    if (combo.length === size) {
      result.push([...combo]);
      return;
    }

    for (let i = start; i < arr.length; i++) {
      combo.push(arr[i]);
      combine(i + 1, combo);
      combo.pop();
    }
  }

  combine(0, []);
  return result;
}

/**
 * 确定多个玩家中的赢家
 * @param players 玩家及其牌型结果
 * @returns 赢家列表（可能有多个平局）
 */
export function determineWinners(
  players: Array<{ playerId: string; hand: HandResult }>
): string[] {
  if (players.length === 0) return [];
  if (players.length === 1) return [players[0].playerId];

  // 找出最高分
  let maxScore = -1;
  for (const player of players) {
    if (player.hand.score > maxScore) {
      maxScore = player.hand.score;
    }
  }

  // 返回所有最高分的玩家
  return players
    .filter((p) => p.hand.score === maxScore)
    .map((p) => p.playerId);
}
