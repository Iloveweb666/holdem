export type RoomStatus = 'WAITING' | 'PLAYING' | 'FINISHED'

export type PlayerStatus =
  | 'STANDING'
  | 'SEATED'
  | 'PLAYING'
  | 'FOLDED'
  | 'ALL_IN'

/** 房间文档 */
export interface Room {
  _id: string
  name: string
  code: string
  ownerId: string
  smallBlind: number
  bigBlind: number
  maxPlayers: number
  minBuyIn: number
  maxBuyIn: number
  status: RoomStatus
  currentGameId?: string
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
}

/** 房间玩家文档 */
export interface RoomPlayer {
  _id: string
  roomId: string
  userId: string
  openid: string
  name: string
  avatar: string
  chips: number
  seatIndex: number | null
  status: PlayerStatus
  isReady: boolean
  joinedAt: Date
  leftAt?: Date
}
