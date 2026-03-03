import { create } from 'zustand';
import Taro from '@tarojs/taro';
import { callCloud, mapId } from '@/services/cloud';

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

  // Actions
  login: () => Promise<boolean>;
  logout: () => void;
  checkAuth: () => void;
  refreshUser: () => Promise<void>;
  setUser: (user: User) => void;
}

const USER_KEY = 'holdem_user';

function computeLevel(totalGames: number): number {
  if (totalGames >= 500) return 10;
  if (totalGames >= 300) return 9;
  if (totalGames >= 200) return 8;
  if (totalGames >= 150) return 7;
  if (totalGames >= 100) return 6;
  if (totalGames >= 60) return 5;
  if (totalGames >= 35) return 4;
  if (totalGames >= 15) return 3;
  if (totalGames >= 5) return 2;
  return 1;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  isLoggedIn: false,
  isLoading: false,
  user: null,

  login: async () => {
    set({ isLoading: true });

    try {
      const response = await callCloud<{
        user: any;
        isNewUser: boolean;
      }>('auth', 'login');

      if (response.success && response.data) {
        const raw = response.data.user;
        const user: User = {
          ...mapId(raw),
          name: raw.name || '微信用户',
          avatar: raw.avatar || null,
          chips: raw.chips ?? 10000,
          consecutiveCheckins: raw.consecutiveCheckins ?? 0,
          lastCheckinDate: raw.lastCheckinDate || null,
          statistics: {
            totalGames: 0,
            wins: 0,
            winRate: 0,
            level: 1,
          },
        };

        Taro.setStorageSync(USER_KEY, JSON.stringify(user));

        set({
          isLoggedIn: true,
          user,
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
    Taro.removeStorageSync(USER_KEY);
    set({
      isLoggedIn: false,
      user: null,
    });
    Taro.reLaunch({ url: '/pages/login/index' });
  },

  checkAuth: () => {
    const userStr = Taro.getStorageSync(USER_KEY);

    if (userStr) {
      try {
        const user = JSON.parse(userStr) as User;
        set({
          isLoggedIn: true,
          user,
        });
      } catch {
        Taro.removeStorageSync(USER_KEY);
      }
    }
  },

  refreshUser: async () => {
    try {
      const response = await callCloud<{
        user: any;
        statistics: any;
      }>('auth', 'getUser');

      if (response.success && response.data) {
        const { user: raw, statistics: stats } = response.data;
        const totalGames = stats?.totalGames ?? 0;
        const wins = stats?.wins ?? 0;

        const user: User = {
          ...mapId(raw),
          name: raw.name || '微信用户',
          avatar: raw.avatar || null,
          chips: raw.chips ?? 0,
          consecutiveCheckins: raw.consecutiveCheckins ?? 0,
          lastCheckinDate: raw.lastCheckinDate || null,
          statistics: {
            totalGames,
            wins,
            winRate: totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0,
            level: computeLevel(totalGames),
          },
        };

        Taro.setStorageSync(USER_KEY, JSON.stringify(user));
        set({ user });
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
