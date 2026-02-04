import type { Room, RoomDetail, GameAction, GameState } from './poker.js';

// ============ API 响应类型 ============

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// ============ 房间 API ============

export interface CreateRoomRequest {
  name: string;
  smallBlind: number;
  bigBlind: number;
  maxPlayers: number;
  minBuyIn: number;
  maxBuyIn: number;
}

export interface JoinRoomRequest {
  roomId: string;
  playerId: string;
  buyIn: number;
  seatIndex?: number;
}

export type GetRoomsResponse = ApiResponse<PaginatedResponse<Room>>;
export type GetRoomDetailResponse = ApiResponse<RoomDetail>;
export type CreateRoomResponse = ApiResponse<{ roomId: string }>;
export type JoinRoomResponse = ApiResponse<{ success: boolean }>;

// ============ 游戏 API ============

export interface GameActionRequest {
  roomId: string;
  playerId: string;
  action: GameAction;
}

export type GetGameStateResponse = ApiResponse<GameState>;
export type GameActionResponse = ApiResponse<{ success: boolean }>;

// ============ WebSocket 消息类型 ============

export type WsMessageType =
  | 'PLAYER_JOINED'
  | 'PLAYER_LEFT'
  | 'GAME_STARTED'
  | 'GAME_ACTION'
  | 'PHASE_CHANGED'
  | 'CARDS_DEALT'
  | 'WINNER_DECLARED'
  | 'HEARTBEAT'
  | 'ERROR';

export interface WsMessage<T = unknown> {
  type: WsMessageType;
  payload: T;
  timestamp: number;
}
