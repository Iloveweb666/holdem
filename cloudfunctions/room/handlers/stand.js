"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stand = stand;
const wx_server_sdk_1 = __importDefault(require("wx-server-sdk"));
const constants_1 = require("../shared/constants");
const response_1 = require("../shared/utils/response");
const getDb = () => wx_server_sdk_1.default.database();
async function stand(params) {
    const { openid, roomId } = params;
    const db = getDb();
    const userResult = await db
        .collection(constants_1.Collections.USERS)
        .where({ openid })
        .limit(1)
        .get();
    if (userResult.data.length === 0) {
        throw new response_1.AppError('USER_NOT_FOUND', '用户不存在');
    }
    const user = userResult.data[0];
    const playerResult = await db
        .collection(constants_1.Collections.ROOM_PLAYERS)
        .where({ roomId, userId: user._id })
        .limit(1)
        .get();
    if (playerResult.data.length === 0) {
        throw new response_1.AppError('NOT_IN_ROOM', '不在房间中');
    }
    const player = playerResult.data[0];
    if (player.seatIndex === null) {
        throw new response_1.AppError('NOT_SEATED', '未入座');
    }
    if (player.status === 'PLAYING') {
        throw new response_1.AppError('GAME_IN_PROGRESS', '游戏进行中不能离席');
    }
    await db.collection(constants_1.Collections.ROOM_PLAYERS).doc(player._id).update({
        data: {
            seatIndex: null,
            status: 'STANDING',
            isReady: false,
        },
    });
    return { success: true };
}
