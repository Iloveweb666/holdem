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

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatar: string | null;
  chips: number;
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
        name: true,
        avatar: true,
        chips: true,
      },
    });

    return user;
  }

  /**
   * 用户登录
   */
  async login(input: LoginInput): Promise<AuthUser> {
    const { email, password } = input;

    // 查找用户
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new Error('INVALID_CREDENTIALS');
    }

    // 验证密码
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);

    if (!isValidPassword) {
      throw new Error('INVALID_CREDENTIALS');
    }

    // 更新最后登录时间
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      chips: user.chips,
    };
  }

  /**
   * 根据 ID 获取用户
   */
  async getUserById(id: string): Promise<AuthUser | null> {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        chips: true,
      },
    });

    return user;
  }
}

export const authService = new AuthService();
