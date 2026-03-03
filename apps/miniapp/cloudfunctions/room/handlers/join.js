"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.join = join;
const wx_server_sdk_1 = __importDefault(require("wx-server-sdk"));
const constants_1 = require("../shared/constants");
const response_1 = require("../shared/utils/response");
const getDb = () => wx_server_sdk_1.default.database();
async function join(params) {
    const { openid, roomId, buyIn } = params;
    const db = getDb();
    const _ = db.command;
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
    // 获取房间
    const roomResult = await db.collection(constants_1.Collections.ROOMS).doc(roomId).get();
    const room = roomResult.data;
    if (!room || room.deletedAt) {
        throw new response_1.AppError('ROOM_NOT_FOUND', '房间不存在');
    }
    // 检查是否已在房间中
    const existingResult = await db
        .collection(constants_1.Collections.ROOM_PLAYERS)
        .where({ roomId, userId: user._id })
        .limit(1)
        .get();
    if (existingResult.data.length > 0) {
        throw new response_1.AppError('ALREADY_IN_ROOM', '已在房间中');
    }
    // 检查房间人数
    const countResult = await db
        .collection(constants_1.Collections.ROOM_PLAYERS)
        .where({ roomId })
        .count();
    if (countResult.total >= room.maxPlayers) {
        throw new response_1.AppError('ROOM_FULL', '房间已满');
    }
    // 验证买入
    if (buyIn < room.minBuyIn || buyIn > room.maxBuyIn) {
        throw new response_1.AppError('INVALID_BUY_IN', `买入金额应在 ${room.minBuyIn}-${room.maxBuyIn} 之间`);
    }
    if (buyIn > user.chips) {
        throw new response_1.AppError('INSUFFICIENT_CHIPS', '筹码不足');
    }
    // 加入房间（站立观战）
    await db.collection(constants_1.Collections.ROOM_PLAYERS).add({
        data: {
            roomId,
            userId: user._id,
            openid,
            name: user.name,
            avatar: user.avatar,
            chips: buyIn,
            seatIndex: null,
            status: 'STANDING',
            isReady: false,
            joinedAt: db.serverDate(),
        },
    });
    // 扣除筹码
    await db.collection(constants_1.Collections.USERS).doc(user._id).update({
        data: { chips: _.inc(-buyIn) },
    });
    // 返回房间和玩家列表
    const playersResult = await db
        .collection(constants_1.Collections.ROOM_PLAYERS)
        .where({ roomId })
        .get();
    return { room, players: playersResult.data };
}
