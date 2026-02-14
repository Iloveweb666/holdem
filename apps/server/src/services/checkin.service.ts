import { prisma } from '@holdem/database';

export interface CheckinResult {
  success: boolean;
  reward: number;
  consecutiveDays: number;
  nextReward: number;
}

export interface CheckinStatus {
  canCheckin: boolean;
  consecutiveDays: number;
  todayChecked: boolean;
  nextReward: number;
}

class CheckinService {
  /**
   * 计算签到奖励
   * 规则：第 n 天 = (n + 1) × 1000
   * 第1天: 2000, 第2天: 3000, 第3天: 4000, ...
   */
  calculateReward(consecutiveDays: number): number {
    return (consecutiveDays + 1) * 1000;
  }

  /**
   * 判断两个日期是否为同一天（本地时区）
   */
  private isSameDay(date1: Date, date2: Date): boolean {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  }

  /**
   * 判断两个日期是否为连续天（date1 是 date2 的前一天）
   */
  private isConsecutiveDay(date1: Date, date2: Date): boolean {
    const oneDay = 24 * 60 * 60 * 1000;
    const date1Start = new Date(
      date1.getFullYear(),
      date1.getMonth(),
      date1.getDate()
    );
    const date2Start = new Date(
      date2.getFullYear(),
      date2.getMonth(),
      date2.getDate()
    );
    return date2Start.getTime() - date1Start.getTime() === oneDay;
  }

  /**
   * 获取签到状态
   */
  async getStatus(userId: string): Promise<CheckinStatus> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        consecutiveCheckins: true,
        lastCheckinDate: true,
      },
    });

    if (!user) {
      throw new Error('USER_NOT_FOUND');
    }

    const today = new Date();
    const todayChecked =
      user.lastCheckinDate && this.isSameDay(user.lastCheckinDate, today);

    // 计算连续签到天数（如果今天签到了则计算当前值，否则看是否断签）
    let consecutiveDays = user.consecutiveCheckins;
    if (!todayChecked && user.lastCheckinDate) {
      // 检查是否断签
      if (!this.isConsecutiveDay(user.lastCheckinDate, today)) {
        consecutiveDays = 0;
      }
    }

    const nextDay = todayChecked ? consecutiveDays + 1 : consecutiveDays + 1;
    const nextReward = this.calculateReward(nextDay);

    return {
      canCheckin: !todayChecked,
      consecutiveDays,
      todayChecked: !!todayChecked,
      nextReward,
    };
  }

  /**
   * 执行签到
   */
  async checkin(userId: string): Promise<CheckinResult> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        consecutiveCheckins: true,
        lastCheckinDate: true,
        chips: true,
      },
    });

    if (!user) {
      throw new Error('USER_NOT_FOUND');
    }

    const today = new Date();

    // 检查今天是否已签到
    if (user.lastCheckinDate && this.isSameDay(user.lastCheckinDate, today)) {
      throw new Error('ALREADY_CHECKED_IN');
    }

    // 计算连续签到天数
    let newConsecutiveDays: number;

    if (
      user.lastCheckinDate &&
      this.isConsecutiveDay(user.lastCheckinDate, today)
    ) {
      // 连续签到
      newConsecutiveDays = user.consecutiveCheckins + 1;
    } else {
      // 断签，重新开始
      newConsecutiveDays = 1;
    }

    // 计算奖励
    const reward = this.calculateReward(newConsecutiveDays);

    // 更新用户数据
    await prisma.user.update({
      where: { id: userId },
      data: {
        consecutiveCheckins: newConsecutiveDays,
        lastCheckinDate: today,
        chips: { increment: reward },
      },
    });

    // 计算明天的奖励
    const nextReward = this.calculateReward(newConsecutiveDays + 1);

    return {
      success: true,
      reward,
      consecutiveDays: newConsecutiveDays,
      nextReward,
    };
  }
}

export const checkinService = new CheckinService();
