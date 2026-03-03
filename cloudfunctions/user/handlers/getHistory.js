"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHistory = getHistory;
const wx_server_sdk_1 = __importDefault(require("wx-server-sdk"));
const constants_1 = require("../shared/constants");
const getDb = () => wx_server_sdk_1.default.database();
async function getHistory(params) {
    const { openid, page = 1, limit = 20, result } = params;
    const db = getDb();
    const pageSize = Math.min(limit, 50);
    const skip = (page - 1) * pageSize;
    const where = { openid };
    if (result) {
        where.result = result;
    }
    const [listResult, countResult] = await Promise.all([
        db
            .collection(constants_1.Collections.GAME_HISTORY)
            .where(where)
            .orderBy('playedAt', 'desc')
            .skip(skip)
            .limit(pageSize)
            .get(),
        db
            .collection(constants_1.Collections.GAME_HISTORY)
            .where(where)
            .count(),
    ]);
    return {
        list: listResult.data,
        pagination: {
            page,
            limit: pageSize,
            total: countResult.total,
        },
    };
}
