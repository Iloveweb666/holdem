// 共享工具函数

/**
 * 生成唯一 ID
 */
export function generateId(prefix: string = ''): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 8);
  return prefix ? `${prefix}_${timestamp}_${random}` : `${timestamp}_${random}`;
}

/**
 * 延迟函数
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 格式化筹码数量
 */
export function formatChips(chips: number): string {
  if (chips >= 1000000) {
    return `${(chips / 1000000).toFixed(1)}M`;
  }
  if (chips >= 1000) {
    return `${(chips / 1000).toFixed(1)}K`;
  }
  return chips.toString();
}
