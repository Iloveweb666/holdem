"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStats = getStats;
const wx_server_sdk_1 = __importDefault(require("wx-server-sdk"));
const constants_1 = require("../shared/constants");
const response_1 = require("../shared/utils/response");
const getDb = () => wx_server_sdk_1.default.database();
async function getStats(params) {
    const { openid } = params;
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
    const statsResult = await db
        .collection(constants_1.Collections.USER_STATISTICS)
        .where({ userId: user._id })
        .limit(1)
        .get();
    const stats = statsResult.data[0];
    return {
        chips: user.chips,
        totalGames: (stats === null || stats === void 0 ? void 0 : stats.totalGames) || 0,
        wins: (stats === null || stats === void 0 ? void 0 : stats.wins) || 0,
        winRate: (stats === null || stats === void 0 ? void 0 : stats.totalGames)
            ? Math.round((stats.wins / stats.totalGames) * 100)
            : 0,
        totalWinnings: (stats === null || stats === void 0 ? void 0 : stats.totalWinnings) || 0,
        totalLosses: (stats === null || stats === void 0 ? void 0 : stats.totalLosses) || 0,
        biggestWin: (stats === null || stats === void 0 ? void 0 : stats.biggestWin) || 0,
        biggestLoss: (stats === null || stats === void 0 ? void 0 : stats.biggestLoss) || 0,
    };
}
