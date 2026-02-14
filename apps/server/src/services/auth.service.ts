import { prisma } from '@holdem/database';
import bcrypt from 'bcryptjs';

export interface RegisterInput {
  email: string;
  password: string;
  name: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface UserStatistics {
  totalGames: number;
  wins: number;
  winRate: number;  // 计算得出
  level: number;    // 根据总场数计算
}

export interface AuthUser {
  id: string;
  email: string | null;
  openid: string | null;
  name: string;
  avatar: string | null;
  chips: number;
  consecutiveCheckins: number;
  lastCheckinDate: Date | null;
  statistics: UserStatistics;
}

/**
 * 根据总场数计算等级
 * LV.1: 0-9场, LV.2: 10-49场, LV.3: 50-99场, ...
 */
function calculateLevel(totalGames: number): number {
  if (totalGames < 10) return 1;
  if (totalGames < 50) return 2;
  if (totalGames < 100) return 3;
  if (totalGames < 200) return 4;
  if (totalGames < 500) return 5;
  if (totalGames < 1000) return 6;
  return Math.min(10, 7 + Math.floor((totalGames - 1000) / 1000));
}

class AuthService {
  /**
   * 用户注册
   */
  async register(input: RegisterInput): Promise<AuthUser> {
    const { email, password, name } = input;

    // 检查邮箱是否已存在
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new Error('EMAIL_ALREADY_EXISTS');
    }

    // 密码加密
    const passwordHash = await bcrypt.hash(password, 10);

    // 创建用户
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        chips: 10000, // 初始筹码
        statistics: {
          create: {}, // 创建空的统计记录
        },
      },
      select: {
        id: true,
        email: true,
        openid: true,
        name: true,
        avatar: true,
        chips: true,
        consecutiveCheckins: true,
        lastCheckinDate: true,
      },
    });

    return {
      ...user,
      statistics: {
        totalGames: 0,
        wins: 0,
        winRate: 0,
        level: 1,
      },
    };
  }

  /**
   * 用户登录
   */
  async login(input: LoginInput): Promise<AuthUser> {
    const { email, password } = input;

    // 查找用户（含统计数据）
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        statistics: true,
      },
    });

    if (!user) {
      throw new Error('INVALID_CREDENTIALS');
    }

    // 验证密码
    if (!user.passwordHash) {
      throw new Error('INVALID_CREDENTIALS');
    }
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);

    if (!isValidPassword) {
      throw new Error('INVALID_CREDENTIALS');
    }

    // 更新最后登录时间
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const totalGames = user.statistics?.totalGames ?? 0;
    const wins = user.statistics?.wins ?? 0;

    return {
      id: user.id,
      email: user.email,
      openid: user.openid,
      name: user.name,
      avatar: user.avatar,
      chips: user.chips,
      consecutiveCheckins: user.consecutiveCheckins,
      lastCheckinDate: user.lastCheckinDate,
      statistics: {
        totalGames,
        wins,
        winRate: totalGames > 0 ? Math.round((wins / totalGames) * 1000) / 10 : 0,
        level: calculateLevel(totalGames),
      },
    };
  }

  /**
   * 根据 ID 获取用户（含统计数据）
   */
  async getUserById(id: string): Promise<AuthUser | null> {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        openid: true,
        name: true,
        avatar: true,
        chips: true,
        consecutiveCheckins: true,
        lastCheckinDate: true,
        statistics: {
          select: {
            totalGames: true,
            wins: true,
          },
        },
      },
    });

    if (!user) return null;

    const totalGames = user.statistics?.totalGames ?? 0;
    const wins = user.statistics?.wins ?? 0;

    return {
      id: user.id,
      email: user.email,
      openid: user.openid,
      name: user.name,
      avatar: user.avatar,
      chips: user.chips,
      consecutiveCheckins: user.consecutiveCheckins,
      lastCheckinDate: user.lastCheckinDate,
      statistics: {
        totalGames,
        wins,
        winRate: totalGames > 0 ? Math.round((wins / totalGames) * 1000) / 10 : 0,
        level: calculateLevel(totalGames),
      },
    };
  }

  /**
   * 更新用户头像
   */
  async updateAvatar(id: string, avatar: string): Promise<void> {
    await prisma.user.update({
      where: { id },
      data: { avatar },
    });
  }

  /**
   * 更新用户昵称
   */
  async updateName(id: string, name: string): Promise<void> {
    await prisma.user.update({
      where: { id },
      data: { name },
    });
  }
}

export const authService = new AuthService();
