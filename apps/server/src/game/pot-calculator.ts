/**
 * 玩家下注信息
 */
export interface PlayerBet {
  playerId: string;
  totalBet: number; // 该轮总下注额
  isAllIn: boolean;
  isFolded: boolean;
}

/**
 * 边池
 */
export interface SidePot {
  amount: number; // 边池金额
  eligiblePlayers: string[]; // 有资格赢取此池的玩家
}

/**
 * 底池分配结果
 */
export interface PotDistribution {
  mainPot: SidePot;
  sidePots: SidePot[];
  totalPot: number;
}

/**
 * 计算边池
 *
 * 边池计算规则：
 * 1. 当玩家全下时，他只能赢取他下注额度以内的筹码
 * 2. 超出部分形成边池，由其他玩家争夺
 *
 * @param bets 所有玩家的下注信息
 * @returns 边池分配结果
 */
export function calculateSidePots(bets: PlayerBet[]): PotDistribution {
  // 过滤掉弃牌的玩家（他们的筹码仍计入底池，但不参与分配）
  const activeBets = bets.filter((b) => !b.isFolded);
  const foldedBets = bets.filter((b) => b.isFolded);

  // 弃牌玩家的筹码总和
  const foldedAmount = foldedBets.reduce((sum, b) => sum + b.totalBet, 0);

  if (activeBets.length === 0) {
    return {
      mainPot: { amount: foldedAmount, eligiblePlayers: [] },
      sidePots: [],
      totalPot: foldedAmount,
    };
  }

  // 按下注额排序（从低到高）
  const sortedBets = [...activeBets].sort(
    (a, b) => a.totalBet - b.totalBet
  );

  const pots: SidePot[] = [];
  let previousBetLevel = 0;

  for (let i = 0; i < sortedBets.length; i++) {
    const currentBetLevel = sortedBets[i].totalBet;

    if (currentBetLevel > previousBetLevel) {
      // 计算当前层级的底池金额
      const levelDiff = currentBetLevel - previousBetLevel;

      // 所有下注达到或超过此层级的玩家都参与
      const eligiblePlayers = sortedBets
        .filter((b) => b.totalBet >= currentBetLevel)
        .map((b) => b.playerId);

      // 计算此层级的总金额
      // 等于 (层级差) × (达到或超过此层级的玩家数)
      const contributingPlayers = sortedBets.filter(
        (b) => b.totalBet >= previousBetLevel + 1
      ).length;
      const potAmount = levelDiff * contributingPlayers;

      if (potAmount > 0) {
        pots.push({
          amount: potAmount,
          eligiblePlayers,
        });
      }

      previousBetLevel = currentBetLevel;
    }
  }

  // 将弃牌玩家的筹码加入主池
  if (pots.length > 0) {
    pots[0].amount += foldedAmount;
  }

  // 分离主池和边池
  const mainPot = pots[0] || { amount: foldedAmount, eligiblePlayers: [] };
  const sidePots = pots.slice(1);

  const totalPot = pots.reduce((sum, p) => sum + p.amount, 0);

  return {
    mainPot,
    sidePots,
    totalPot,
  };
}

/**
 * 简化版边池计算（当没有全下时使用）
 */
export function calculateSimplePot(bets: PlayerBet[]): number {
  return bets.reduce((sum, b) => sum + b.totalBet, 0);
}

/**
 * 分配底池给赢家
 *
 * 根据德州扑克规则：平局时除不尽的筹码分给"位置不佳的人"（最先叫注的人）
 *
 * @param pots 底池信息
 * @param getWinners 获取赢家函数
 * @param playerPositions 玩家位置（按行动顺序排列，可选）
 * @returns 每个玩家应获得的筹码
 */
export function distributePots(
  pots: PotDistribution,
  getWinners: (eligiblePlayers: string[]) => string[],
  playerPositions?: string[]
): Map<string, number> {
  const distribution = new Map<string, number>();

  /**
   * 按位置排序赢家（位置靠前的玩家优先获得余数）
   */
  const sortWinnersByPosition = (winners: string[]): string[] => {
    if (!playerPositions || playerPositions.length === 0) {
      return winners;
    }
    return [...winners].sort((a, b) => {
      const posA = playerPositions.indexOf(a);
      const posB = playerPositions.indexOf(b);
      // 位置越靠前（索引越小）越先获得余数
      return posA - posB;
    });
  };

  // 分配主池
  const mainWinners = sortWinnersByPosition(getWinners(pots.mainPot.eligiblePlayers));
  if (mainWinners.length > 0) {
    const share = Math.floor(pots.mainPot.amount / mainWinners.length);
    let remainder = pots.mainPot.amount % mainWinners.length;

    for (const playerId of mainWinners) {
      const current = distribution.get(playerId) || 0;
      // 位置靠前的玩家优先获得余数
      const extra = remainder > 0 ? 1 : 0;
      remainder--;
      distribution.set(playerId, current + share + extra);
    }
  }

  // 分配边池
  for (const sidePot of pots.sidePots) {
    const sideWinners = sortWinnersByPosition(getWinners(sidePot.eligiblePlayers));
    if (sideWinners.length > 0) {
      const share = Math.floor(sidePot.amount / sideWinners.length);
      let remainder = sidePot.amount % sideWinners.length;

      for (const playerId of sideWinners) {
        const current = distribution.get(playerId) || 0;
        const extra = remainder > 0 ? 1 : 0;
        remainder--;
        distribution.set(playerId, current + share + extra);
      }
    }
  }

  return distribution;
}

/**
 * 计算玩家需要跟注的金额
 */
export function calculateCallAmount(
  playerCurrentBet: number,
  highestBet: number
): number {
  return Math.max(0, highestBet - playerCurrentBet);
}

/**
 * 计算最小加注额
 * 德州扑克规则：加注额必须至少等于上一次加注的增量
 */
export function calculateMinRaise(
  currentBet: number,
  lastRaiseAmount: number,
  bigBlind: number
): number {
  // 最小加注额 = 当前最高下注 + 上次加注额（至少为大盲）
  const minRaiseIncrement = Math.max(lastRaiseAmount, bigBlind);
  return currentBet + minRaiseIncrement;
}
