"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.create = create;
const wx_server_sdk_1 = __importDefault(require("wx-server-sdk"));
const constants_1 = require("../shared/constants");
const helpers_1 = require("../shared/utils/helpers");
const response_1 = require("../shared/utils/response");
const getDb = () => wx_server_sdk_1.default.database();
async function create(params) {
    const { openid, name, bigBlind, buyIn } = params;
    const db = getDb();
    const _ = db.command;
    // 参数校验
    if (!name || name.length < 1 || name.length > 20) {
        throw new response_1.AppError('INVALID_PARAMS', '房间名称长度应在 1-20 个字符之间');
    }
    if (bigBlind < constants_1.BIG_BLIND_MIN || bigBlind > constants_1.BIG_BLIND_MAX) {
        throw new response_1.AppError('INVALID_PARAMS', `大盲注应在 ${constants_1.BIG_BLIND_MIN}-${constants_1.BIG_BLIND_MAX} 之间`);
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
    const minBuyIn = bigBlind * constants_1.BUY_IN_MIN_MULTIPLIER;
    const maxBuyIn = bigBlind * constants_1.BUY_IN_MAX_MULTIPLIER;
    if (buyIn < minBuyIn) {
        throw new response_1.AppError('INVALID_BUY_IN', `买入金额至少 ${minBuyIn}`);
    }
    if (buyIn > maxBuyIn) {
        throw new response_1.AppError('INVALID_BUY_IN', `买入金额最多 ${maxBuyIn}`);
    }
    if (buyIn > user.chips) {
        throw new response_1.AppError('INSUFFICIENT_CHIPS', '筹码不足');
    }
    const code = (0, helpers_1.generateRoomCode)();
    // 创建房间
    const room = {
        name,
        code,
        ownerId: user._id,
        smallBlind: Math.floor(bigBlind / 2),
        bigBlind,
        maxPlayers: constants_1.MAX_PLAYERS,
        minBuyIn,
        maxBuyIn,
        status: 'WAITING',
        currentGameId: null,
        createdAt: db.serverDate(),
        updatedAt: db.serverDate(),
        deletedAt: null,
    };
    const roomResult = await db.collection(constants_1.Collections.ROOMS).add({ data: room });
    const roomId = roomResult._id;
    // 房主自动加入并入座 1 号位
    await db.collection(constants_1.Collections.ROOM_PLAYERS).add({
        data: {
            roomId,
            userId: user._id,
            openid,
            name: user.name,
            avatar: user.avatar,
            chips: buyIn,
            seatIndex: 0,
            status: 'SEATED',
            isReady: false,
            joinedAt: db.serverDate(),
        },
    });
    // 扣除用户筹码
    await db.collection(constants_1.Collections.USERS).doc(user._id).update({
        data: { chips: _.inc(-buyIn) },
    });
    return { room: { _id: roomId, ...room } };
}
