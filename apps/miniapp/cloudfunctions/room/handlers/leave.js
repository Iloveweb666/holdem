"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.leave = leave;
const wx_server_sdk_1 = __importDefault(require("wx-server-sdk"));
const constants_1 = require("../shared/constants");
const response_1 = require("../shared/utils/response");
const getDb = () => wx_server_sdk_1.default.database();
async function leave(params) {
    const { openid, roomId } = params;
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
    // 不允许游戏中离开
    if (player.status === 'PLAYING') {
        throw new response_1.AppError('GAME_IN_PROGRESS', '游戏进行中不能离开');
    }
    // 退还筹码
    await db.collection(constants_1.Collections.USERS).doc(user._id).update({
        data: { chips: _.inc(player.chips) },
    });
    // 删除玩家记录
    await db.collection(constants_1.Collections.ROOM_PLAYERS).doc(player._id).remove();
    // 检查房间是否还有人
    const remainingResult = await db
        .collection(constants_1.Collections.ROOM_PLAYERS)
        .where({ roomId })
        .count();
    if (remainingResult.total === 0) {
        // 房间没人了，软删除
        await db.collection(constants_1.Collections.ROOMS).doc(roomId).update({
            data: {
                status: 'FINISHED',
                deletedAt: db.serverDate(),
                updatedAt: db.serverDate(),
            },
        });
    }
    else if (player.userId === (await getRoomOwnerId(roomId))) {
        // 如果离开的是房主，转移房主给下一个玩家
        const nextPlayer = await db
            .collection(constants_1.Collections.ROOM_PLAYERS)
            .where({ roomId })
            .limit(1)
            .get();
        if (nextPlayer.data.length > 0) {
            await db.collection(constants_1.Collections.ROOMS).doc(roomId).update({
                data: {
                    ownerId: nextPlayer.data[0].userId,
                    updatedAt: db.serverDate(),
                },
            });
        }
    }
    return { refundChips: player.chips };
}
async function getRoomOwnerId(roomId) {
    const db = getDb();
    const roomResult = await db.collection(constants_1.Collections.ROOMS).doc(roomId).get();
    return roomResult.data.ownerId;
}
