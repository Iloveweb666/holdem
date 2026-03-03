"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUser = getUser;
const wx_server_sdk_1 = __importDefault(require("wx-server-sdk"));
const constants_1 = require("../shared/constants");
const response_1 = require("../shared/utils/response");
const getDb = () => wx_server_sdk_1.default.database();
async function getUser(params) {
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
    // 获取统计
    const statsResult = await db
        .collection(constants_1.Collections.USER_STATISTICS)
        .where({ userId: user._id })
        .limit(1)
        .get();
    return {
        user,
        statistics: statsResult.data[0] || null,
    };
}
