import Taro from '@tarojs/taro';
import type { ApiResponse } from '@holdem/shared-types';

// API 基础地址（通过 Taro defineConstants 注入）
declare const API_URL: string;
const BASE_URL = API_URL;

const TOKEN_KEY = 'holdem_token';

interface RequestOptions {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  data?: Record<string, unknown>;
  header?: Record<string, string>;
  showLoading?: boolean;
  showError?: boolean;
}

export async function request<T>(options: RequestOptions): Promise<ApiResponse<T>> {
  const {
    url,
    method = 'GET',
    data,
    header = {},
    showLoading = false,
    showError = true,
  } = options;

  // 获取 token
  const token = Taro.getStorageSync(TOKEN_KEY);
  if (token) {
    header['Authorization'] = `Bearer ${token}`;
  }

  // 设置 Content-Type
  if (!header['Content-Type']) {
    header['Content-Type'] = 'application/json';
  }

  if (showLoading) {
    Taro.showLoading({ title: '加载中...' });
  }

  try {
    const response = await Taro.request({
      url: `${BASE_URL}${url}`,
      method,
      data,
      header,
    });

    if (showLoading) {
      Taro.hideLoading();
    }

    const result = response.data as ApiResponse<T>;

    // 处理 401 未授权
    if (response.statusCode === 401) {
      // 清除 token 并跳转到登录页
      Taro.removeStorageSync(TOKEN_KEY);
      Taro.removeStorageSync('holdem_user');
      Taro.reLaunch({ url: '/pages/login/index' });
      return {
        success: false,
        error: { code: 'UNAUTHORIZED', message: '登录已过期' },
      };
    }

    // 处理其他错误
    if (!result.success && showError && result.error) {
      Taro.showToast({
        title: result.error.message || '请求失败',
        icon: 'none',
      });
    }

    return result;
  } catch (error) {
    if (showLoading) {
      Taro.hideLoading();
    }

    console.error('Request error:', error);

    if (showError) {
      Taro.showToast({
        title: '网络错误',
        icon: 'none',
      });
    }

    return {
      success: false,
      error: { code: 'NETWORK_ERROR', message: '网络错误' },
    };
  }
}

// 签到 API
export const checkinApi = {
  getStatus: () => request<{
    canCheckin: boolean;
    consecutiveDays: number;
    todayChecked: boolean;
    nextReward: number;
  }>({
    url: '/api/checkin/status',
    method: 'GET',
  }),

  checkin: () => request<{
    success: boolean;
    reward: number;
    consecutiveDays: number;
    nextReward: number;
  }>({
    url: '/api/checkin',
    method: 'POST',
    data: {
      check: 1
    },  // 需要传递空对象，避免 Fastify 报错
  }),
};
