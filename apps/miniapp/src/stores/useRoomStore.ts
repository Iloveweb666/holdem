import { create } from 'zustand';
import { request } from '@/services/request';
import type { Room } from '@holdem/shared-types';

interface RoomListState {
  rooms: Room[];
  isLoading: boolean;
  page: number;
  hasMore: boolean;

  // Current room
  currentRoom: Room | null;
  currentRoomId: string | null;

  // Actions
  fetchRooms: (refresh?: boolean) => Promise<void>;
  createRoom: (data: {
    name: string;
    smallBlind: number;
    bigBlind: number;
    maxPlayers?: number;
    minBuyIn?: number;
    maxBuyIn?: number;
  }) => Promise<{ roomId: string; code: string } | null>;
  joinRoom: (roomId: string, buyIn: number, seatIndex?: number) => Promise<boolean>;
  leaveRoom: (roomId: string) => Promise<boolean>;
  fetchRoomDetail: (roomId: string) => Promise<void>;
  setCurrentRoom: (room: Room | null) => void;
  clearCurrentRoom: () => void;
}

export const useRoomStore = create<RoomListState>((set, get) => ({
  rooms: [],
  isLoading: false,
  page: 1,
  hasMore: true,
  currentRoom: null,
  currentRoomId: null,

  fetchRooms: async (refresh = false) => {
    const { isLoading, page, hasMore } = get();
    if (isLoading || (!refresh && !hasMore)) return;

    const targetPage = refresh ? 1 : page;
    set({ isLoading: true });

    try {
      const response = await request<{
        items: Room[];
        total: number;
        page: number;
        pageSize: number;
        hasMore: boolean;
      }>({
        url: '/api/rooms',
        method: 'GET',
        data: { page: targetPage, pageSize: 10 },
      });

      if (response.success && response.data) {
        const { items, hasMore: more } = response.data;
        set({
          rooms: refresh ? items : [...get().rooms, ...items],
          page: targetPage + 1,
          hasMore: more,
          isLoading: false,
        });
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      console.error('Fetch rooms error:', error);
      set({ isLoading: false });
    }
  },

  createRoom: async (data) => {
    try {
      const response = await request<{ roomId: string; code: string }>({
        url: '/api/rooms',
        method: 'POST',
        data,
      });

      if (response.success && response.data) {
        // 刷新房间列表
        get().fetchRooms(true);
        return response.data;
      }
      return null;
    } catch (error) {
      console.error('Create room error:', error);
      return null;
    }
  },

  joinRoom: async (roomId, buyIn, seatIndex) => {
    try {
      const response = await request<{ success: boolean; seatIndex: number }>({
        url: `/api/rooms/${roomId}/join`,
        method: 'POST',
        data: { buyIn, seatIndex },
      });

      if (response.success) {
        set({ currentRoomId: roomId });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Join room error:', error);
      return false;
    }
  },

  leaveRoom: async (roomId) => {
    try {
      const response = await request<{ success: boolean; returnedChips: number }>({
        url: `/api/rooms/${roomId}/leave`,
        method: 'POST',
      });

      if (response.success) {
        set({ currentRoomId: null, currentRoom: null });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Leave room error:', error);
      return false;
    }
  },

  fetchRoomDetail: async (roomId) => {
    try {
      const response = await request<Room>({
        url: `/api/rooms/${roomId}`,
        method: 'GET',
      });

      if (response.success && response.data) {
        set({ currentRoom: response.data, currentRoomId: roomId });
      }
    } catch (error) {
      console.error('Fetch room detail error:', error);
    }
  },

  setCurrentRoom: (room) => {
    set({ currentRoom: room, currentRoomId: room?.id || null });
  },

  clearCurrentRoom: () => {
    set({ currentRoom: null, currentRoomId: null });
  },
}));
