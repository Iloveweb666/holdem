"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sit = sit;
const wx_server_sdk_1 = __importDefault(require("wx-server-sdk"));
const constants_1 = require("../shared/constants");
const response_1 = require("../shared/utils/response");
const getDb = () => wx_server_sdk_1.default.database();
async function sit(params) {
    const { openid, roomId, seatIndex } = params;
    const db = getDb();
    // 校验座位号
    if (seatIndex < 0 || seatIndex >= constants_1.MAX_PLAYERS) {
        throw new response_1.AppError('INVALID_SEAT', `座位号应在 0-${constants_1.MAX_PLAYERS - 1} 之间`);
    }
    // 获取用户
    const userResult = await db
        .collection(constants_1.Collections.USERS)
        .where({ openid })
        .limit(1)
        .get();
    if (userResult.data.length === 0) {
        throw new response_1.AppError('USER_NOT_FOUND', '用户不存在');
    }
    const user = userResult.data[0];
    // 获取玩家记录
    const playerResult = await db
        .collection(constants_1.Collections.ROOM_PLAYERS)
        .where({ roomId, userId: user._id })
        .limit(1)
        .get();
    if (playerResult.data.length === 0) {
        throw new response_1.AppError('NOT_IN_ROOM', '不在房间中');
    }
    const player = playerResult.data[0];
    if (player.seatIndex !== null) {
        throw new response_1.AppError('ALREADY_SEATED', '已经入座');
    }
    // 检查座位是否已被占
    const seatResult = await db
        .collection(constants_1.Collections.ROOM_PLAYERS)
        .where({ roomId, seatIndex })
        .limit(1)
        .get();
    if (seatResult.data.length > 0) {
        throw new response_1.AppError('SEAT_TAKEN', '座位已被占用');
    }
    // 入座
    await db.collection(constants_1.Collections.ROOM_PLAYERS).doc(player._id).update({
        data: {
            seatIndex,
            status: 'SEATED',
        },
    });
    return { seatIndex };
}
