import Taro from '@tarojs/taro';
import type { ApiResponse } from '@holdem/shared-types';

/**
 * Call a WeChat cloud function.
 * Cloud functions receive OPENID automatically — no token needed.
 */
export async function callCloud<T>(
  name: string,
  action: string,
  params: Record<string, unknown> = {},
): Promise<ApiResponse<T>> {
  try {
    const res = await Taro.cloud.callFunction({
      name,
      data: { action, ...params },
    });

    const result = res.result as { data?: T; error?: { code: string; message: string } };

    if (result.error) {
      return { success: false, error: result.error };
    }

    return { success: true, data: result.data as T };
  } catch (error) {
    console.error(`Cloud function [${name}:${action}] error:`, error);
    return {
      success: false,
      error: { code: 'CLOUD_ERROR', message: '网络错误' },
    };
  }
}

/** Map cloud DB `_id` to frontend `id` */
export function mapId<T extends { _id?: string; id?: string }>(obj: T): T & { id: string } {
  const { _id, ...rest } = obj as any;
  return { ...rest, id: _id || obj.id || '' };
}

// ── Checkin helpers ──────────────────────────────────────────────────

const CHECKIN_REWARDS = [2000, 2500, 3000, 4000, 5000, 6500, 7000];

function isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

export function computeCheckinStatus(
  lastCheckinDate: string | Date | null,
  consecutiveCheckins: number,
) {
  const today = new Date();
  const todayChecked = lastCheckinDate ? isSameDay(new Date(lastCheckinDate), today) : false;
  const rewardIndex = consecutiveCheckins % CHECKIN_REWARDS.length;
  const nextReward = CHECKIN_REWARDS[todayChecked ? (rewardIndex + 1) % CHECKIN_REWARDS.length : rewardIndex];

  return {
    canCheckin: !todayChecked,
    consecutiveDays: consecutiveCheckins,
    todayChecked,
    nextReward,
  };
}

export const checkinApi = {
  /** Compute checkin status from user data (no dedicated backend endpoint) */
  getStatus: async (): Promise<ApiResponse<{
    canCheckin: boolean;
    consecutiveDays: number;
    todayChecked: boolean;
    nextReward: number;
  }>> => {
    const res = await callCloud<{
      user: any;
      statistics: any;
    }>('auth', 'getUser');

    if (!res.success || !res.data) {
      return { success: false, error: res.error };
    }

    const { user } = res.data;
    const status = computeCheckinStatus(user.lastCheckinDate, user.consecutiveCheckins || 0);
    return { success: true, data: status };
  },

  /** Perform checkin via cloud function */
  checkin: async (): Promise<ApiResponse<{
    reward: number;
    consecutiveDays: number;
    nextReward: number;
  }>> => {
    const res = await callCloud<{
      reward: number;
      consecutiveDays: number;
      totalChips: number;
    }>('user', 'checkin');

    if (!res.success || !res.data) {
      return { success: false, error: res.error };
    }

    const { reward, consecutiveDays } = res.data;
    const rewardIndex = (consecutiveDays) % CHECKIN_REWARDS.length;
    const nextReward = CHECKIN_REWARDS[rewardIndex];

    return {
      success: true,
      data: { reward, consecutiveDays, nextReward },
    };
  },
};
