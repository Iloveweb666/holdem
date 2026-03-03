/** 用户文档 */
export interface User {
  _id: string
  _openid: string
  openid: string
  unionid?: string
  name: string
  avatar: string
  chips: number
  consecutiveCheckins: number
  lastCheckinDate: Date | null
  createdAt: Date
  lastLoginAt: Date
}

/** 用户统计文档 */
export interface UserStatistics {
  _id: string
  userId: string
  totalGames: number
  wins: number
  totalWinnings: number
  totalLosses: number
  biggestWin: number
  biggestLoss: number
  createdAt: Date
  updatedAt: Date
}
