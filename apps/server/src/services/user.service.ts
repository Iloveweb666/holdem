import { prisma } from '@holdem/database';

export interface UserPublicInfo {
  id: string;
  name: string;
  avatar: string | null;
  chips: number;
}

export interface UserStatistics {
  totalGames: number;
  wins: number;
  totalWinnings: number;
  totalLosses: number;
  winRate: number;
}

export interface UpdateUserInput {
  name?: string;
  avatar?: string;
}

class UserService {
  /**
   * 获取用户公开信息
   */
  async getUser(id: string): Promise<UserPublicInfo | null> {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        avatar: true,
        chips: true,
      },
    });

    return user;
  }

  /**
   * 更新用户信息
   */
  async updateUser(id: string, data: UpdateUserInput): Promise<UserPublicInfo> {
    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.avatar && { avatar: data.avatar }),
      },
      select: {
        id: true,
        name: true,
        avatar: true,
        chips: true,
      },
    });

    return user;
  }

  /**
   * 获取用户统计数据
   */
  async getUserStatistics(id: string): Promise<UserStatistics | null> {
    const stats = await prisma.userStatistics.findUnique({
      where: { userId: id },
    });

    if (!stats) {
      return null;
    }

    const winRate = stats.totalGames > 0 ? (stats.wins / stats.totalGames) * 100 : 0;

    return {
      totalGames: stats.totalGames,
      wins: stats.wins,
      totalWinnings: stats.totalWinnings,
      totalLosses: stats.totalLosses,
      winRate: Math.round(winRate * 100) / 100,
    };
  }

  /**
   * 更新用户筹码
   */
  async updateChips(id: string, amount: number): Promise<number> {
    const user = await prisma.user.update({
      where: { id },
      data: {
        chips: { increment: amount },
      },
      select: { chips: true },
    });

    return user.chips;
  }

  /**
   * 获取用户对局历史
   */
  async getUserGames(
    userId: string,
    options: { page?: number; pageSize?: number } = {}
  ) {
    const { page = 1, pageSize = 10 } = options;

    const [games, total] = await Promise.all([
      prisma.gameAction.findMany({
        where: { userId },
        select: {
          game: {
            select: {
              id: true,
              roomId: true,
              phase: true,
              pot: true,
              startedAt: true,
              endedAt: true,
              room: {
                select: {
                  name: true,
                  smallBlind: true,
                  bigBlind: true,
                },
              },
            },
          },
        },
        distinct: ['gameId'],
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.gameAction.groupBy({
        by: ['gameId'],
        where: { userId },
        _count: true,
      }),
    ]);

    return {
      items: games.map((g) => g.game),
      total: total.length,
      page,
      pageSize,
      hasMore: page * pageSize < total.length,
    };
  }
}

export const userService = new UserService();
