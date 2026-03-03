"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = login;
const wx_server_sdk_1 = __importDefault(require("wx-server-sdk"));
const constants_1 = require("../shared/constants");
const helpers_1 = require("../shared/utils/helpers");
const getDb = () => wx_server_sdk_1.default.database();
async function login(params) {
    const { openid, userInfo } = params;
    const db = getDb();
    const userResult = await db
        .collection(constants_1.Collections.USERS)
        .where({ openid })
        .limit(1)
        .get();
    // 已有用户 → 更新登录时间
    if (userResult.data.length > 0) {
        const user = userResult.data[0];
        const updateData = {
            lastLoginAt: db.serverDate(),
        };
        if (userInfo) {
            updateData.name = userInfo.nickName;
            updateData.avatar = userInfo.avatarUrl;
        }
        await db.collection(constants_1.Collections.USERS).doc(user._id).update({ data: updateData });
        return { user: { ...user, ...updateData }, isNewUser: false };
    }
    // 新用户 → 注册
    const newUser = {
        openid,
        name: (userInfo === null || userInfo === void 0 ? void 0 : userInfo.nickName) || `玩家${(0, helpers_1.generateShortId)()}`,
        avatar: (userInfo === null || userInfo === void 0 ? void 0 : userInfo.avatarUrl) || '',
        chips: constants_1.INITIAL_CHIPS,
        consecutiveCheckins: 0,
        lastCheckinDate: null,
        createdAt: db.serverDate(),
        lastLoginAt: db.serverDate(),
    };
    const result = await db.collection(constants_1.Collections.USERS).add({ data: newUser });
    // 初始化统计记录
    await db.collection(constants_1.Collections.USER_STATISTICS).add({
        data: {
            userId: result._id,
            totalGames: 0,
            wins: 0,
            totalWinnings: 0,
            totalLosses: 0,
            biggestWin: 0,
            biggestLoss: 0,
            createdAt: db.serverDate(),
            updatedAt: db.serverDate(),
        },
    });
    return { user: { _id: result._id, ...newUser }, isNewUser: true };
}
