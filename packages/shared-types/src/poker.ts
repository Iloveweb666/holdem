// ============ 基础类型 ============

export type Suit = 'h' | 'd' | 'c' | 's'; // hearts, diamonds, clubs, spades
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';
export type Card = `${Rank}${Suit}`;

export type PlayerStatus = 'active' | 'folded' | 'all-in' | 'waiting' | 'disconnected';
export type RoomStatus = 'waiting' | 'playing' | 'finished';
export type GamePhase = 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';
export type PlayerAction = 'fold' | 'check' | 'call' | 'raise' | 'all-in';

// ============ 玩家相关 ============

export type SeatPosition = 'bottom' | 'top' | 'left' | 'right';

export interface Player {
  id: string;
  name: string;
  avatar?: string;
  chips: number;
  bet?: number;
  cards?: [Card, Card] | [string, string];
  isDealer?: boolean;
  isTurn?: boolean;
  status?: PlayerStatus;
  seatIndex?: number;
  position?: SeatPosition;
}

export interface PlayerSession extends Player {
  sessionId: string;
  lastHeartbeat: number;
  isOnline: boolean;
}

// ============ 房间相关 ============

export interface Room {
  id: string;
  name: string;
  smallBlind: number;
  bigBlind: number;
  playersCount: number;
  maxPlayers: number;
  status: RoomStatus;
  minBuyIn?: number;
  maxBuyIn?: number;
}

export interface RoomDetail extends Room {
  players: Player[];
  communityCards: Card[];
  pot: number;
  currentPhase: GamePhase;
  currentPlayerIndex: number;
  dealerIndex: number;
  createdAt: number;
}

// ============ 游戏动作 ============

export interface GameAction {
  type: PlayerAction;
  playerId: string;
  amount?: number;
  timestamp: number;
}

export interface GameState {
  roomId: string;
  phase: GamePhase;
  pot: number;
  communityCards: Card[];
  players: Player[];
  currentPlayerIndex: number;
  minRaise: number;
  actions: GameAction[];
}
