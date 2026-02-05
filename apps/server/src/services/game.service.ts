import { prisma, GamePhase, ActionType, RoomStatus, PlayerStatus } from '@holdem/database';

export interface GameActionInput {
  gameId: string;
  userId: string;
  actionType: ActionType;
  amount?: number;
}

export interface GameResultInput {
  userId: string;
  amount: number;
}

class GameService {
  /**
   * 开始新游戏
   */
  async startGame(roomId: string) {
    // 获取房间内的玩家
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: {
        players: {
          where: { leftAt: null },
          orderBy: { seatIndex: 'asc' },
        },
        games: {
          where: { endedAt: null },
          take: 1,
        },
      },
    });

    if (!room) {
      throw new Error('ROOM_NOT_FOUND');
    }

    if (room.players.length < 2) {
      throw new Error('NOT_ENOUGH_PLAYERS');
    }

    // 检查是否有进行中的游戏
    if (room.games.length > 0) {
      throw new Error('GAME_IN_PROGRESS');
    }

    // 创建新游戏
    const game = await prisma.game.create({
      data: {
        roomId,
        phase: GamePhase.PREFLOP,
        pot: 0,
        communityCards: [],
        dealerIndex: 0, // 可以根据实际逻辑轮换
        currentPlayerIdx: 0,
      },
    });

    // 更新房间状态
    await prisma.room.update({
      where: { id: roomId },
      data: { status: RoomStatus.PLAYING },
    });

    // 更新玩家状态为 ACTIVE
    await prisma.roomPlayer.updateMany({
      where: {
        roomId,
        leftAt: null,
      },
      data: { status: PlayerStatus.ACTIVE },
    });

    return game;
  }

  /**
   * 记录游戏动作
   */
  async recordAction(input: GameActionInput) {
    const { gameId, userId, actionType, amount } = input;

    // 验证游戏存在且进行中
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: {
        room: {
          include: {
            players: {
              where: { leftAt: null },
            },
          },
        },
      },
    });

    if (!game) {
      throw new Error('GAME_NOT_FOUND');
    }

    if (game.endedAt) {
      throw new Error('GAME_ENDED');
    }

    // 验证玩家在游戏中
    const roomPlayer = game.room.players.find((p) => p.userId === userId);
    if (!roomPlayer) {
      throw new Error('PLAYER_NOT_IN_GAME');
    }

    // 记录动作
    const action = await prisma.gameAction.create({
      data: {
        gameId,
        userId,
        actionType,
        amount,
      },
    });

    // 更新底池（如果有金额）
    if (amount && amount > 0) {
      await prisma.$transaction([
        prisma.game.update({
          where: { id: gameId },
          data: { pot: { increment: amount } },
        }),
        prisma.roomPlayer.update({
          where: { id: roomPlayer.id },
          data: { chips: { decrement: amount } },
        }),
      ]);
    }

    // 更新玩家状态
    if (actionType === ActionType.FOLD) {
      await prisma.roomPlayer.update({
        where: { id: roomPlayer.id },
        data: { status: PlayerStatus.FOLDED },
      });
    } else if (actionType === ActionType.ALL_IN) {
      await prisma.roomPlayer.update({
        where: { id: roomPlayer.id },
        data: { status: PlayerStatus.ALL_IN },
      });
    }

    return action;
  }

  /**
   * 更新游戏阶段
   */
  async updatePhase(gameId: string, phase: GamePhase, communityCards?: string[]) {
    const updateData: { phase: GamePhase; communityCards?: string[] } = { phase };

    if (communityCards) {
      updateData.communityCards = communityCards;
    }

    await prisma.game.update({
      where: { id: gameId },
      data: updateData,
    });
  }

  /**
   * 结束游戏
   */
  async endGame(gameId: string, winners: GameResultInput[]) {
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: {
        room: {
          include: {
            players: {
              where: { leftAt: null },
            },
          },
        },
      },
    });

    if (!game) {
      throw new Error('GAME_NOT_FOUND');
    }

    // 记录游戏结果
    await prisma.gameResult.create({
      data: {
        gameId,
        winners: JSON.parse(JSON.stringify(winners)),
      },
    });

    // 标记游戏结束
    await prisma.game.update({
      where: { id: gameId },
      data: {
        endedAt: new Date(),
        phase: GamePhase.SHOWDOWN,
      },
    });

    // 分配奖金给赢家
    for (const winner of winners) {
      const roomPlayer = game.room.players.find((p) => p.userId === winner.userId);
      if (roomPlayer) {
        await prisma.roomPlayer.update({
          where: { id: roomPlayer.id },
          data: { chips: { increment: winner.amount } },
        });

        // 更新用户统计
        await prisma.userStatistics.update({
          where: { userId: winner.userId },
          data: {
            totalGames: { increment: 1 },
            wins: { increment: 1 },
            totalWinnings: { increment: winner.amount },
          },
        });
      }
    }

    // 更新输家统计
    const winnerIds = winners.map((w) => w.userId);
    const losers = game.room.players.filter((p) => !winnerIds.includes(p.userId));

    for (const loser of losers) {
      await prisma.userStatistics.update({
        where: { userId: loser.userId },
        data: {
          totalGames: { increment: 1 },
          totalLosses: { increment: 1 },
        },
      });
    }

    // 更新房间状态
    await prisma.room.update({
      where: { id: game.roomId },
      data: { status: RoomStatus.WAITING },
    });

    // 重置玩家状态
    await prisma.roomPlayer.updateMany({
      where: {
        roomId: game.roomId,
        leftAt: null,
      },
      data: { status: PlayerStatus.WAITING },
    });

    return { success: true };
  }

  /**
   * 获取游戏详情
   */
  async getGame(gameId: string) {
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: {
        room: {
          select: {
            name: true,
            smallBlind: true,
            bigBlind: true,
          },
        },
        actions: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        results: true,
      },
    });

    return game;
  }

  /**
   * 获取游戏动作历史
   */
  async getGameActions(gameId: string) {
    const actions = await prisma.gameAction.findMany({
      where: { gameId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return actions;
  }
}

export const gameService = new GameService();
