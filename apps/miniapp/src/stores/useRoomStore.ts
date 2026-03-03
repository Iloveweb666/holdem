import { create } from 'zustand';
import { callCloud, mapId } from '@/services/cloud';
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
    bigBlind: number;
    buyIn: number;
  }) => Promise<{ roomId: string; code: string } | null>;
  joinRoom: (roomId: string, buyIn: number, seatIndex?: number) => Promise<boolean>;
  leaveRoom: (roomId: string) => Promise<boolean>;
  fetchRoomDetail: (roomId: string) => Promise<void>;
  setCurrentRoom: (room: Room | null) => void;
  clearCurrentRoom: () => void;
}

function mapRoom(raw: any): Room {
  return {
    ...mapId(raw),
    name: raw.name,
    code: raw.code,
    smallBlind: raw.smallBlind,
    bigBlind: raw.bigBlind,
    maxPlayers: raw.maxPlayers,
    playersCount: raw.currentPlayers ?? raw.playersCount ?? 0,
    status: (raw.status || 'WAITING').toLowerCase(),
  } as Room;
}

export const useRoomStore = create<RoomListState>((set, get) => ({
  rooms: [],
  isLoading: false,
  page: 1,
  hasMore: false,
  currentRoom: null,
  currentRoomId: null,

  fetchRooms: async (_refresh = false) => {
    const { isLoading } = get();
    if (isLoading) return;

    set({ isLoading: true });

    try {
      const response = await callCloud<{ rooms: any[] }>('room', 'list');

      if (response.success && response.data) {
        const rooms = response.data.rooms.map(mapRoom);
        set({
          rooms,
          page: 1,
          hasMore: false,
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
      const response = await callCloud<{ room: any }>('room', 'create', {
        name: data.name,
        bigBlind: data.bigBlind,
        buyIn: data.buyIn,
      });

      if (response.success && response.data) {
        const room = mapRoom(response.data.room);
        // Refresh room list in background
        get().fetchRooms(true);
        return { roomId: room.id, code: (room as any).code || '' };
      }
      return null;
    } catch (error) {
      console.error('Create room error:', error);
      return null;
    }
  },

  joinRoom: async (roomId, buyIn, _seatIndex?) => {
    try {
      const response = await callCloud<{ room: any; players: any[] }>('room', 'join', {
        roomId,
        buyIn,
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
      const response = await callCloud<{ success: boolean }>('room', 'leave', { roomId });

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
      // No dedicated endpoint — fetch all rooms and filter
      const response = await callCloud<{ rooms: any[] }>('room', 'list');

      if (response.success && response.data) {
        const raw = response.data.rooms.find((r: any) => (r._id || r.id) === roomId);
        if (raw) {
          const room = mapRoom(raw);
          set({ currentRoom: room, currentRoomId: roomId });
        }
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
