import { prisma, GamePhase, ActionType, RoomStatus, PlayerStatus } from '@holdem/database';
import type { Card } from '@holdem/shared-types';
import {
  Deck,
  evaluateHand,
  determineWinners,
  calculateSidePots,
  distributePots,
  type PlayerBet,
  type HandResult,
} from '../game/index.js';

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

/**
 * 游戏运行时状态（内存中管理）
 */
interface GameRuntimeState {
  deck: Deck;
  playerCards: Map<string, [Card, Card]>; // userId -> holeCards
  communityCards: Card[];
  currentBets: Map<string, number>; // userId -> current round bet
  totalBets: Map<string, number>; // userId -> total game bet
  lastRaiseAmount: number;
}

class GameService {
  // 内存中的游戏运行时状态
  private gameStates: Map<string, GameRuntimeState> = new Map();

  /**
   * 初始化游戏运行时状态
   */
  private initGameState(gameId: string): GameRuntimeState {
    const deck = new Deck();
    deck.shuffle();

    const state: GameRuntimeState = {
      deck,
      playerCards: new Map(),
      communityCards: [],
      currentBets: new Map(),
      totalBets: new Map(),
      lastRaiseAmount: 0,
    };

    this.gameStates.set(gameId, state);
    return state;
  }

  /**
   * 获取游戏运行时状态
   */
  private getGameState(gameId: string): GameRuntimeState | undefined {
    return this.gameStates.get(gameId);
  }

  /**
   * 清理游戏运行时状态
   */
  private clearGameState(gameId: string): void {
    this.gameStates.delete(gameId);
  }

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

    // 计算庄家位置（轮换）
    const lastGame = await prisma.game.findFirst({
      where: { roomId, endedAt: { not: null } },
      orderBy: { endedAt: 'desc' },
    });
    const dealerIndex = lastGame
      ? (lastGame.dealerIndex + 1) % room.players.length
      : 0;

    // 计算小盲和大盲位置
    const smallBlindIndex = (dealerIndex + 1) % room.players.length;
    const bigBlindIndex = (dealerIndex + 2) % room.players.length;

    // 创建新游戏
    const game = await prisma.game.create({
      data: {
        roomId,
        phase: GamePhase.PREFLOP,
        pot: room.smallBlind + room.bigBlind,
        communityCards: [],
        dealerIndex,
        smallBlindIndex,
        bigBlindIndex,
        currentPlayerIdx: (bigBlindIndex + 1) % room.players.length, // 大盲后一位先行动
        currentBet: room.bigBlind,
      },
    });

    // 初始化游戏运行时状态
    const gameState = this.initGameState(game.id);
    gameState.lastRaiseAmount = room.bigBlind;

    // 发底牌给每个玩家
    for (const player of room.players) {
      const holeCards = gameState.deck.deal(2) as [Card, Card];
      gameState.playerCards.set(player.userId, holeCards);
      gameState.currentBets.set(player.userId, 0);
      gameState.totalBets.set(player.userId, 0);
    }

    // 扣除盲注
    const smallBlindPlayer = room.players[smallBlindIndex];
    const bigBlindPlayer = room.players[bigBlindIndex];

    await prisma.$transaction([
      // 更新房间状态
      prisma.room.update({
        where: { id: roomId },
        data: { status: RoomStatus.PLAYING },
      }),
      // 更新玩家状态为 ACTIVE
      prisma.roomPlayer.updateMany({
        where: { roomId, leftAt: null },
        data: { status: PlayerStatus.ACTIVE },
      }),
      // 扣除小盲
      prisma.roomPlayer.update({
        where: { id: smallBlindPlayer.id },
        data: { chips: { decrement: room.smallBlind } },
      }),
      // 扣除大盲
      prisma.roomPlayer.update({
        where: { id: bigBlindPlayer.id },
        data: { chips: { decrement: room.bigBlind } },
      }),
      // 记录小盲动作
      prisma.gameAction.create({
        data: {
          gameId: game.id,
          userId: smallBlindPlayer.userId,
          phase: GamePhase.PREFLOP,
          actionType: ActionType.BLIND,
          amount: room.smallBlind,
        },
      }),
      // 记录大盲动作
      prisma.gameAction.create({
        data: {
          gameId: game.id,
          userId: bigBlindPlayer.userId,
          phase: GamePhase.PREFLOP,
          actionType: ActionType.BLIND,
          amount: room.bigBlind,
        },
      }),
    ]);

    // 更新运行时状态中的下注
    gameState.currentBets.set(smallBlindPlayer.userId, room.smallBlind);
    gameState.totalBets.set(smallBlindPlayer.userId, room.smallBlind);
    gameState.currentBets.set(bigBlindPlayer.userId, room.bigBlind);
    gameState.totalBets.set(bigBlindPlayer.userId, room.bigBlind);

    return {
      game,
      dealerIndex,
      smallBlindIndex,
      bigBlindIndex,
      playerCards: Object.fromEntries(gameState.playerCards),
    };
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
        phase: game.phase,
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

    // 清理游戏运行时状态
    this.clearGameState(gameId);

    return { success: true };
  }

  /**
   * 发公共牌（flop/turn/river）
   */
  async dealCommunityCards(gameId: string, phase: GamePhase): Promise<Card[]> {
    const gameState = this.getGameState(gameId);
    if (!gameState) {
      throw new Error('GAME_STATE_NOT_FOUND');
    }

    let newCards: Card[] = [];

    switch (phase) {
      case GamePhase.FLOP:
        // 烧一张牌，发三张
        gameState.deck.burn();
        newCards = gameState.deck.deal(3);
        break;

      case GamePhase.TURN:
      case GamePhase.RIVER:
        // 烧一张牌，发一张
        gameState.deck.burn();
        newCards = gameState.deck.deal(1);
        break;

      default:
        throw new Error('INVALID_PHASE_FOR_DEALING');
    }

    // 更新运行时状态
    gameState.communityCards.push(...newCards);

    // 重置当前轮下注
    for (const [userId] of gameState.currentBets) {
      gameState.currentBets.set(userId, 0);
    }
    gameState.lastRaiseAmount = 0;

    // 更新数据库
    await prisma.game.update({
      where: { id: gameId },
      data: {
        phase,
        communityCards: gameState.communityCards,
      },
    });

    return newCards;
  }

  /**
   * 获取玩家底牌
   */
  getPlayerCards(gameId: string, userId: string): [Card, Card] | undefined {
    const gameState = this.getGameState(gameId);
    if (!gameState) return undefined;
    return gameState.playerCards.get(userId);
  }

  /**
   * 获取公共牌
   */
  getCommunityCards(gameId: string): Card[] {
    const gameState = this.getGameState(gameId);
    return gameState?.communityCards || [];
  }

  /**
   * 评估所有玩家的牌型并确定赢家
   */
  async determineGameWinners(gameId: string): Promise<{
    winners: Array<{ playerId: string; hand: HandResult; winAmount: number }>;
    distribution: Map<string, number>;
  }> {
    const gameState = this.getGameState(gameId);
    if (!gameState) {
      throw new Error('GAME_STATE_NOT_FOUND');
    }

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

    // 筛选出未弃牌的玩家
    const activePlayers = game.room.players.filter(
      (p) => p.status !== PlayerStatus.FOLDED
    );

    // 评估每个活跃玩家的牌型
    const playerHands: Array<{ playerId: string; hand: HandResult }> = [];

    for (const player of activePlayers) {
      const holeCards = gameState.playerCards.get(player.userId);
      if (!holeCards) continue;

      const hand = evaluateHand(holeCards, gameState.communityCards);
      playerHands.push({
        playerId: player.userId,
        hand,
      });
    }

    // 构建下注信息用于边池计算
    const bets: PlayerBet[] = game.room.players.map((p) => ({
      playerId: p.userId,
      totalBet: gameState.totalBets.get(p.userId) || 0,
      isAllIn: p.status === PlayerStatus.ALL_IN,
      isFolded: p.status === PlayerStatus.FOLDED,
    }));

    // 计算边池
    const pots = calculateSidePots(bets);

    // 分配底池
    const distribution = distributePots(pots, (eligiblePlayers) => {
      // 从符合条件的玩家中找出最佳牌型
      const eligible = playerHands.filter((ph) =>
        eligiblePlayers.includes(ph.playerId)
      );
      return determineWinners(eligible);
    });

    // 构建赢家信息
    const winners: Array<{
      playerId: string;
      hand: HandResult;
      winAmount: number;
    }> = [];

    for (const [playerId, amount] of distribution) {
      const playerHand = playerHands.find((ph) => ph.playerId === playerId);
      if (playerHand && amount > 0) {
        winners.push({
          playerId,
          hand: playerHand.hand,
          winAmount: amount,
        });
      }
    }

    return { winners, distribution };
  }

  /**
   * 完成 showdown 阶段并结束游戏
   */
  async showdownAndEnd(gameId: string): Promise<{
    winners: Array<{ playerId: string; hand: HandResult; winAmount: number }>;
  }> {
    // 确定赢家和分配
    const { winners, distribution } = await this.determineGameWinners(gameId);

    // 转换为 GameResultInput 格式
    const gameResults: GameResultInput[] = winners.map((w) => ({
      userId: w.playerId,
      amount: w.winAmount,
    }));

    // 调用现有的 endGame 方法
    await this.endGame(gameId, gameResults);

    // 清理运行时状态
    this.clearGameState(gameId);

    return { winners };
  }

  /**
   * 获取当前轮最高下注
   */
  getCurrentHighestBet(gameId: string): number {
    const gameState = this.getGameState(gameId);
    if (!gameState) return 0;

    let highest = 0;
    for (const bet of gameState.currentBets.values()) {
      if (bet > highest) highest = bet;
    }
    return highest;
  }

  /**
   * 更新玩家下注
   */
  updatePlayerBet(gameId: string, userId: string, amount: number): void {
    const gameState = this.getGameState(gameId);
    if (!gameState) return;

    const currentBet = gameState.currentBets.get(userId) || 0;
    gameState.currentBets.set(userId, currentBet + amount);

    const totalBet = gameState.totalBets.get(userId) || 0;
    gameState.totalBets.set(userId, totalBet + amount);
  }

  /**
   * 设置最后加注金额
   */
  setLastRaiseAmount(gameId: string, amount: number): void {
    const gameState = this.getGameState(gameId);
    if (gameState) {
      gameState.lastRaiseAmount = amount;
    }
  }

  /**
   * 获取最后加注金额
   */
  getLastRaiseAmount(gameId: string): number {
    const gameState = this.getGameState(gameId);
    return gameState?.lastRaiseAmount || 0;
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
