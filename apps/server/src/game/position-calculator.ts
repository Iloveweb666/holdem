import type { TablePosition } from '@holdem/shared-types';

/**
 * 计算牌桌位置
 *
 * 位置重要性（从差到好）：
 * 1. 小盲 (SB) - 翻牌后第一个行动
 * 2. 大盲 (BB) - 被迫下注，位置不佳
 * 3. 枪口位 (UTG) - 翻牌前第一个行动
 * 4. UTG+1, UTG+2 - 早期位置
 * 5. 中位 (MP, MP+1) - 中期位置
 * 6. 关煞位 (CO) - 后期位置
 * 7. 按钮位 (BTN) - 最佳位置
 */

/**
 * 根据座位数和庄家位置计算所有玩家的牌桌位置
 *
 * @param playerCount 玩家数量（2-10）
 * @param dealerIndex 庄家座位索引
 * @returns 每个座位索引对应的牌桌位置
 */
export function calculateTablePositions(
  playerCount: number,
  dealerIndex: number
): Map<number, TablePosition> {
  const positions = new Map<number, TablePosition>();

  // 特殊情况：单挑（2人）
  if (playerCount === 2) {
    // 单挑时，庄家是小盲，另一个是大盲
    positions.set(dealerIndex, 'SB');
    positions.set((dealerIndex + 1) % playerCount, 'BB');
    return positions;
  }

  // 3人及以上
  const btnIndex = dealerIndex;
  const sbIndex = (dealerIndex + 1) % playerCount;
  const bbIndex = (dealerIndex + 2) % playerCount;

  positions.set(btnIndex, 'BTN');
  positions.set(sbIndex, 'SB');
  positions.set(bbIndex, 'BB');

  // 剩余位置按顺序分配
  const remainingCount = playerCount - 3;

  if (remainingCount <= 0) return positions;

  // 位置分配顺序（从大盲后开始）
  const positionOrder: TablePosition[] = [];

  if (remainingCount >= 1) positionOrder.push('UTG');
  if (remainingCount >= 2) positionOrder.push('UTG+1');
  if (remainingCount >= 3) positionOrder.push('UTG+2');
  if (remainingCount >= 4) positionOrder.push('MP');
  if (remainingCount >= 5) positionOrder.push('MP+1');
  if (remainingCount >= 6) positionOrder.push('CO');
  // 如果还有更多位置，会覆盖前面的

  // 6人桌特殊处理：没有 UTG+1, UTG+2，直接用 UTG, MP, CO
  if (playerCount === 6) {
    const adjusted: TablePosition[] = ['UTG', 'MP', 'CO'];
    for (let i = 0; i < 3; i++) {
      const seatIndex = (bbIndex + 1 + i) % playerCount;
      positions.set(seatIndex, adjusted[i]);
    }
    return positions;
  }

  // 分配剩余位置
  for (let i = 0; i < remainingCount; i++) {
    const seatIndex = (bbIndex + 1 + i) % playerCount;
    if (i < positionOrder.length) {
      positions.set(seatIndex, positionOrder[i]);
    }
  }

  return positions;
}

/**
 * 获取翻牌前的行动顺序（从UTG开始到大盲结束）
 */
export function getPreflopActionOrder(
  playerCount: number,
  dealerIndex: number
): number[] {
  const order: number[] = [];
  const bbIndex = (dealerIndex + 2) % playerCount;

  // 从大盲后开始，到大盲结束
  for (let i = 1; i <= playerCount; i++) {
    order.push((bbIndex + i) % playerCount);
  }

  return order;
}

/**
 * 获取翻牌后的行动顺序（从小盲开始到按钮结束）
 */
export function getPostflopActionOrder(
  playerCount: number,
  dealerIndex: number
): number[] {
  const order: number[] = [];
  const sbIndex = (dealerIndex + 1) % playerCount;

  // 从小盲开始
  for (let i = 0; i < playerCount; i++) {
    order.push((sbIndex + i) % playerCount);
  }

  return order;
}

/**
 * 获取位置名称（中文）
 */
export function getPositionName(position: TablePosition): string {
  const names: Record<TablePosition, string> = {
    'UTG': '枪口位',
    'UTG+1': '枪口位+1',
    'UTG+2': '枪口位+2',
    'MP': '中位',
    'MP+1': '中位+1',
    'CO': '关煞位',
    'BTN': '庄家位',
    'SB': '小盲',
    'BB': '大盲',
  };
  return names[position];
}
