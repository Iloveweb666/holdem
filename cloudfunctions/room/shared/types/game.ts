export type GamePhase = 'PREFLOP' | 'FLOP' | 'TURN' | 'RIVER' | 'SHOWDOWN'

export type GameAction = 'fold' | 'check' | 'call' | 'raise' | 'all_in'

export type GamePlayerStatus = 'ACTIVE' | 'FOLDED' | 'ALL_IN'

export type Suit = 'h' | 'd' | 'c' | 's'
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'T' | 'J' | 'Q' | 'K' | 'A'
export type Card = `${Rank}${Suit}`

/** 游戏中玩家状态（公开，不含私牌） */
export interface GamePlayerState {
  userId: string
  seatIndex: number
  chips: number
  bet: number
  totalBet: number
  status: GamePlayerStatus
}

/** 内部玩家状态（含私牌，仅引擎内部使用） */
export interface InternalPlayerState extends GamePlayerState {
  holeCards: Card[]
}

/** 游戏结果 */
export interface GameResult {
  userId: string
  handRank?: string
  bestHand?: Card[]
  chipsWon: number
  chipsLost: number
  isWinner: boolean
}

/** 游戏文档（存入数据库的公开状态） */
export interface Game {
  _id: string
  roomId: string
  roundNumber: number
  phase: GamePhase
  isEnded: boolean
  pot: number
  communityCards: Card[]
  dealerIndex: number
  smallBlindIndex: number
  bigBlindIndex: number
  currentPlayerIndex: number
  currentBet: number
  minRaise: number
  players: GamePlayerState[]
  results?: GameResult[]
  createdAt: Date
  updatedAt: Date
  endedAt?: Date
}

/** 玩家私牌文档 */
export interface PlayerCards {
  _id: string
  _openid: string
  gameId: string
  userId: string
  openid: string
  cards: Card[]
}

/** 游戏历史文档 */
export interface GameHistory {
  _id: string
  _openid: string
  gameId: string
  roomId: string
  roomName: string
  userId: string
  openid: string
  result: 'win' | 'lose'
  chipsChange: number
  handRank?: string
  playedAt: Date
}
