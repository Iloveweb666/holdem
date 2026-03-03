"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkin = checkin;
const wx_server_sdk_1 = __importDefault(require("wx-server-sdk"));
const constants_1 = require("../shared/constants");
const helpers_1 = require("../shared/utils/helpers");
const response_1 = require("../shared/utils/response");
const getDb = () => wx_server_sdk_1.default.database();
async function checkin(params) {
    const { openid } = params;
    const db = getDb();
    const _ = db.command;
    const userResult = await db
        .collection(constants_1.Collections.USERS)
        .where({ openid })
        .limit(1)
        .get();
    if (userResult.data.length === 0) {
        throw new response_1.AppError('USER_NOT_FOUND', '用户不存在');
    }
    const user = userResult.data[0];
    const today = (0, helpers_1.getTodayStart)();
    // 检查今日是否已签到
    if (user.lastCheckinDate) {
        const lastCheckin = new Date(user.lastCheckinDate);
        if ((0, helpers_1.isSameDay)(lastCheckin, today)) {
            throw new response_1.AppError('ALREADY_CHECKED_IN', '今日已签到');
        }
    }
    // 计算连续签到天数
    let consecutiveDays = 1;
    if (user.lastCheckinDate) {
        const yesterday = (0, helpers_1.getYesterdayStart)();
        const lastCheckin = new Date(user.lastCheckinDate);
        lastCheckin.setHours(0, 0, 0, 0);
        if ((0, helpers_1.isSameDay)(lastCheckin, yesterday)) {
            consecutiveDays = user.consecutiveCheckins + 1;
        }
        // 否则断签，重置为 1
    }
    // 计算奖励（循环使用 7 天奖励表）
    const rewardIndex = ((consecutiveDays - 1) % constants_1.CHECKIN_REWARDS.length);
    const reward = constants_1.CHECKIN_REWARDS[rewardIndex];
    // 更新用户
    await db.collection(constants_1.Collections.USERS).doc(user._id).update({
        data: {
            chips: _.inc(reward),
            consecutiveCheckins: consecutiveDays,
            lastCheckinDate: db.serverDate(),
        },
    });
    return {
        reward,
        consecutiveDays,
        totalChips: user.chips + reward,
    };
}
