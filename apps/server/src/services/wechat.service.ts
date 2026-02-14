import { prisma } from '@holdem/database';

// 微信 code2session 响应
interface WechatSessionResponse {
  openid: string;
  session_key: string;
  unionid?: string;
  errcode?: number;
  errmsg?: string;
}

export interface WechatUser {
  id: string;
  openid: string;
  name: string;
  avatar: string | null;
  chips: number;
  consecutiveCheckins: number;
  lastCheckinDate: Date | null;
}

class WechatService {
  private appId: string;
  private appSecret: string;

  constructor() {
    this.appId = process.env.WECHAT_APPID || '';
    this.appSecret = process.env.WECHAT_SECRET || '';
  }

  /**
   * 调用微信 code2session 接口
   */
  async code2Session(code: string): Promise<WechatSessionResponse> {
    const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${this.appId}&secret=${this.appSecret}&js_code=${code}&grant_type=authorization_code`;

    const response = await fetch(url);
    const data = (await response.json()) as WechatSessionResponse;

    if (data.errcode && data.errcode !== 0) {
      throw new Error(`WECHAT_ERROR: ${data.errmsg}`);
    }

    return data;
  }

  /**
   * 微信登录
   * 根据 code 获取 openid，查找或创建用户
   */
  async login(code: string): Promise<WechatUser> {
    // 1. 调用微信接口获取 openid
    const session = await this.code2Session(code);
    const { openid, unionid } = session;

    // 2. 查找现有用户
    let user = await prisma.user.findUnique({
      where: { openid },
    });

    // 3. 如果用户不存在，创建新用户
    if (!user) {
      // 生成随机用户名
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      const defaultName = `玩家${randomSuffix}`;

      user = await prisma.user.create({
        data: {
          openid,
          unionid,
          name: defaultName,
          chips: 10000, // 初始筹码
          statistics: {
            create: {}, // 创建空的统计记录
          },
        },
      });
    } else {
      // 更新最后登录时间和 unionid（如果有变化）
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          lastLoginAt: new Date(),
          ...(unionid && !user.unionid ? { unionid } : {}),
        },
      });
    }

    return {
      id: user.id,
      openid: user.openid!,
      name: user.name,
      avatar: user.avatar,
      chips: user.chips,
      consecutiveCheckins: user.consecutiveCheckins,
      lastCheckinDate: user.lastCheckinDate,
    };
  }

  /**
   * 根据 openid 获取用户
   */
  async getUserByOpenid(openid: string): Promise<WechatUser | null> {
    const user = await prisma.user.findUnique({
      where: { openid },
    });

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      openid: user.openid!,
      name: user.name,
      avatar: user.avatar,
      chips: user.chips,
      consecutiveCheckins: user.consecutiveCheckins,
      lastCheckinDate: user.lastCheckinDate,
    };
  }

  /**
   * 更新用户信息（头像、昵称）
   */
  async updateUserInfo(
    userId: string,
    data: { name?: string; avatar?: string }
  ): Promise<WechatUser> {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.name ? { name: data.name } : {}),
        ...(data.avatar ? { avatar: data.avatar } : {}),
      },
    });

    return {
      id: user.id,
      openid: user.openid!,
      name: user.name,
      avatar: user.avatar,
      chips: user.chips,
      consecutiveCheckins: user.consecutiveCheckins,
      lastCheckinDate: user.lastCheckinDate,
    };
  }
}

export const wechatService = new WechatService();
