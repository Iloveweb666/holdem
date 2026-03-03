/** 初始筹码 */
export const INITIAL_CHIPS = 10000

/** 最大玩家数 */
export const MAX_PLAYERS = 8

/** 大盲注范围 */
export const BIG_BLIND_MIN = 10
export const BIG_BLIND_MAX = 1000

/** 买入倍率 */
export const BUY_IN_MIN_MULTIPLIER = 20
export const BUY_IN_MAX_MULTIPLIER = 200

/** 签到奖励表（第 1-7 天循环） */
export const CHECKIN_REWARDS = [2000, 2500, 3000, 4000, 5000, 6500, 7000]

/** 房间号长度 */
export const ROOM_CODE_LENGTH = 6

/** 集合名 */
export const Collections = {
  USERS: 'users',
  USER_STATISTICS: 'user_statistics',
  ROOMS: 'rooms',
  ROOM_PLAYERS: 'room_players',
  GAMES: 'games',
  PLAYER_CARDS: 'player_cards',
  GAME_HISTORY: 'game_history',
} as const
