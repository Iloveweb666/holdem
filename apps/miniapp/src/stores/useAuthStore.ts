import { create } from 'zustand';
import Taro from '@tarojs/taro';
import { request } from '@/services/request';

export interface UserStatistics {
  totalGames: number;
  wins: number;
  winRate: number;
  level: number;
}

export interface User {
  id: string;
  name: string;
  avatar: string | null;
  chips: number;
  consecutiveCheckins: number;
  lastCheckinDate: string | null;
  statistics: UserStatistics;
}

interface AuthState {
  isLoggedIn: boolean;
  isLoading: boolean;
  user: User | null;
  token: string | null;

  // Actions
  login: () => Promise<boolean>;
  logout: () => void;
  checkAuth: () => void;
  refreshUser: () => Promise<void>;
  setUser: (user: User) => void;
}

const TOKEN_KEY = 'holdem_token';
const USER_KEY = 'holdem_user';

export const useAuthStore = create<AuthState>((set, get) => ({
  isLoggedIn: false,
  isLoading: false,
  user: null,
  token: null,

  login: async () => {
    set({ isLoading: true });

    try {
      // 获取微信登录凭证
      const loginResult = await Taro.login();
      if (!loginResult.code) {
        throw new Error('获取微信登录凭证失败');
      }

      // 调用后端微信登录接口
      const response = await request<{
        user: User;
        token: string;
      }>({
        url: '/api/auth/wechat',
        method: 'POST',
        data: { code: loginResult.code },
      });

      if (response.success && response.data) {
        const { user, token } = response.data;

        // 存储到本地
        Taro.setStorageSync(TOKEN_KEY, token);
        Taro.setStorageSync(USER_KEY, JSON.stringify(user));

        set({
          isLoggedIn: true,
          user,
          token,
          isLoading: false,
        });

        return true;
      } else {
        throw new Error(response.error?.message || '登录失败');
      }
    } catch (error) {
      console.error('Login error:', error);
      set({ isLoading: false });
      Taro.showToast({
        title: '登录失败',
        icon: 'error',
      });
      return false;
    }
  },

  logout: () => {
    Taro.removeStorageSync(TOKEN_KEY);
    Taro.removeStorageSync(USER_KEY);
    set({
      isLoggedIn: false,
      user: null,
      token: null,
    });
    // 跳转到登录页
    Taro.reLaunch({ url: '/pages/login/index' });
  },

  checkAuth: () => {
    const token = Taro.getStorageSync(TOKEN_KEY);
    const userStr = Taro.getStorageSync(USER_KEY);

    if (token && userStr) {
      try {
        const user = JSON.parse(userStr) as User;
        set({
          isLoggedIn: true,
          user,
          token,
        });
      } catch {
        // 解析失败，清除缓存
        Taro.removeStorageSync(TOKEN_KEY);
        Taro.removeStorageSync(USER_KEY);
      }
    }
  },

  refreshUser: async () => {
    const { token } = get();
    if (!token) return;

    try {
      const response = await request<User>({
        url: '/api/auth/me',
        method: 'GET',
      });

      if (response.success && response.data) {
        Taro.setStorageSync(USER_KEY, JSON.stringify(response.data));
        set({ user: response.data });
      }
    } catch (error) {
      console.error('Refresh user error:', error);
    }
  },

  setUser: (user: User) => {
    Taro.setStorageSync(USER_KEY, JSON.stringify(user));
    set({ user });
  },
}));
