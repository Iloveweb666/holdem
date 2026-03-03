"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Collections = exports.ROOM_CODE_LENGTH = exports.CHECKIN_REWARDS = exports.BUY_IN_MAX_MULTIPLIER = exports.BUY_IN_MIN_MULTIPLIER = exports.BIG_BLIND_MAX = exports.BIG_BLIND_MIN = exports.MAX_PLAYERS = exports.INITIAL_CHIPS = void 0;
/** 初始筹码 */
exports.INITIAL_CHIPS = 10000;
/** 最大玩家数 */
exports.MAX_PLAYERS = 8;
/** 大盲注范围 */
exports.BIG_BLIND_MIN = 10;
exports.BIG_BLIND_MAX = 1000;
/** 买入倍率 */
exports.BUY_IN_MIN_MULTIPLIER = 20;
exports.BUY_IN_MAX_MULTIPLIER = 200;
/** 签到奖励表（第 1-7 天循环） */
exports.CHECKIN_REWARDS = [2000, 2500, 3000, 4000, 5000, 6500, 7000];
/** 房间号长度 */
exports.ROOM_CODE_LENGTH = 6;
/** 集合名 */
exports.Collections = {
    USERS: 'users',
    USER_STATISTICS: 'user_statistics',
    ROOMS: 'rooms',
    ROOM_PLAYERS: 'room_players',
    GAMES: 'games',
    PLAYER_CARDS: 'player_cards',
    GAME_HISTORY: 'game_history',
};
