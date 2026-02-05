import { prisma, RoomStatus, PlayerStatus } from '@holdem/database';
import type { RoomStatus as ApiRoomStatus, PlayerStatus as ApiPlayerStatus } from '@holdem/shared-types';

// 转换 Prisma 枚举到 API 格式
const roomStatusMap: Record<RoomStatus, ApiRoomStatus> = {
  [RoomStatus.WAITING]: 'waiting',
  [RoomStatus.PLAYING]: 'playing',
  [RoomStatus.FINISHED]: 'finished',
};

const playerStatusMap: Record<PlayerStatus, ApiPlayerStatus> = {
  [PlayerStatus.WAITING]: 'waiting',
  [PlayerStatus.ACTIVE]: 'active',
  [PlayerStatus.FOLDED]: 'folded',
  [PlayerStatus.ALL_IN]: 'all-in',
  [PlayerStatus.DISCONNECTED]: 'disconnected',
};

export interface CreateRoomInput {
  name: string;
  smallBlind: number;
  bigBlind: number;
  maxPlayers?: number;
  minBuyIn?: number;
  maxBuyIn?: number;
}

export interface JoinRoomInput {
  roomId: string;
  userId: string;
  buyIn: number;
  seatIndex?: number;
}

export interface RoomListFilters {
  status?: RoomStatus;
  page?: number;
  pageSize?: number;
}

class RoomService {
  /**
   * 创建房间
   */
  async createRoom(input: CreateRoomInput) {
    const room = await prisma.room.create({
      data: {
        name: input.name,
        smallBlind: input.smallBlind,
        bigBlind: input.bigBlind,
        maxPlayers: input.maxPlayers ?? 6,
        minBuyIn: input.minBuyIn,
        maxBuyIn: input.maxBuyIn,
      },
    });

    return room;
  }

  /**
   * 获取房间列表
   */
  async getRooms(filters: RoomListFilters = {}) {
    const { status, page = 1, pageSize = 10 } = filters;

    const where = status ? { status } : {};

    const [rooms, total] = await Promise.all([
      prisma.room.findMany({
        where,
        include: {
          _count: {
            select: { players: { where: { leftAt: null } } },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.room.count({ where }),
    ]);

    return {
      items: rooms.map((room) => ({
        id: room.id,
        name: room.name,
        smallBlind: room.smallBlind,
        bigBlind: room.bigBlind,
        maxPlayers: room.maxPlayers,
        minBuyIn: room.minBuyIn ?? undefined,
        maxBuyIn: room.maxBuyIn ?? undefined,
        status: roomStatusMap[room.status],
        playersCount: room._count.players,
      })),
      total,
      page,
      pageSize,
      hasMore: page * pageSize < total,
    };
  }

  /**
   * 获取房间详情
   */
  async getRoom(id: string) {
    const room = await prisma.room.findUnique({
      where: { id },
      include: {
        players: {
          where: { leftAt: null },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
          },
          orderBy: { seatIndex: 'asc' },
        },
        games: {
          where: { endedAt: null },
          take: 1,
          orderBy: { startedAt: 'desc' },
        },
      },
    });

    if (!room) {
      return null;
    }

    const currentGame = room.games[0];

    return {
      id: room.id,
      name: room.name,
      smallBlind: room.smallBlind,
      bigBlind: room.bigBlind,
      maxPlayers: room.maxPlayers,
      minBuyIn: room.minBuyIn ?? undefined,
      maxBuyIn: room.maxBuyIn ?? undefined,
      status: roomStatusMap[room.status],
      playersCount: room.players.length,
      players: room.players.map((p) => ({
        id: p.user.id,
        name: p.user.name,
        avatar: p.user.avatar,
        chips: p.chips,
        seatIndex: p.seatIndex,
        status: playerStatusMap[p.status],
      })),
      currentGame: currentGame
        ? {
            id: currentGame.id,
            phase: currentGame.phase.toLowerCase(),
            pot: currentGame.pot,
            communityCards: currentGame.communityCards,
            dealerIndex: currentGame.dealerIndex,
            currentPlayerIndex: currentGame.currentPlayerIdx,
          }
        : null,
      createdAt: room.createdAt.getTime(),
    };
  }

  /**
   * 加入房间
   */
  async joinRoom(input: JoinRoomInput) {
    const { roomId, userId, buyIn, seatIndex } = input;

    // 获取房间信息
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: {
        players: {
          where: { leftAt: null },
        },
      },
    });

    if (!room) {
      throw new Error('ROOM_NOT_FOUND');
    }

    if (room.players.length >= room.maxPlayers) {
      throw new Error('ROOM_FULL');
    }

    // 检查用户是否已在房间
    const existingPlayer = room.players.find((p) => p.userId === userId);
    if (existingPlayer) {
      throw new Error('ALREADY_IN_ROOM');
    }

    // 检查买入金额
    if (room.minBuyIn && buyIn < room.minBuyIn) {
      throw new Error('BUY_IN_TOO_LOW');
    }
    if (room.maxBuyIn && buyIn > room.maxBuyIn) {
      throw new Error('BUY_IN_TOO_HIGH');
    }

    // 检查用户筹码是否足够
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { chips: true },
    });

    if (!user || user.chips < buyIn) {
      throw new Error('INSUFFICIENT_CHIPS');
    }

    // 确定座位
    const occupiedSeats = room.players.map((p) => p.seatIndex);
    let finalSeatIndex = seatIndex;

    if (finalSeatIndex === undefined || occupiedSeats.includes(finalSeatIndex)) {
      // 找到第一个空座位
      for (let i = 0; i < room.maxPlayers; i++) {
        if (!occupiedSeats.includes(i)) {
          finalSeatIndex = i;
          break;
        }
      }
    }

    if (finalSeatIndex === undefined) {
      throw new Error('NO_AVAILABLE_SEAT');
    }

    // 事务：扣除筹码并加入房间
    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { chips: { decrement: buyIn } },
      }),
      prisma.roomPlayer.create({
        data: {
          roomId,
          userId,
          chips: buyIn,
          seatIndex: finalSeatIndex,
          status: PlayerStatus.WAITING,
        },
      }),
    ]);

    return { success: true, seatIndex: finalSeatIndex };
  }

  /**
   * 离开房间
   */
  async leaveRoom(roomId: string, userId: string) {
    // 获取玩家在房间的信息
    const roomPlayer = await prisma.roomPlayer.findFirst({
      where: {
        roomId,
        userId,
        leftAt: null,
      },
    });

    if (!roomPlayer) {
      throw new Error('NOT_IN_ROOM');
    }

    // 事务：归还筹码并标记离开
    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { chips: { increment: roomPlayer.chips } },
      }),
      prisma.roomPlayer.update({
        where: { id: roomPlayer.id },
        data: { leftAt: new Date() },
      }),
    ]);

    return { success: true, returnedChips: roomPlayer.chips };
  }

  /**
   * 更新房间状态
   */
  async updateRoomStatus(roomId: string, status: RoomStatus) {
    await prisma.room.update({
      where: { id: roomId },
      data: { status },
    });
  }
}

export const roomService = new RoomService();
