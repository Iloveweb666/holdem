"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = main;
const wx_server_sdk_1 = __importDefault(require("wx-server-sdk"));
const checkin_1 = require("./handlers/checkin");
const getStats_1 = require("./handlers/getStats");
const getHistory_1 = require("./handlers/getHistory");
const updateProfile_1 = require("./handlers/updateProfile");
wx_server_sdk_1.default.init({ env: wx_server_sdk_1.default.DYNAMIC_CURRENT_ENV });
const handlers = {
    checkin: checkin_1.checkin,
    getStats: getStats_1.getStats,
    getHistory: getHistory_1.getHistory,
    updateProfile: updateProfile_1.updateProfile,
};
async function main(event, context) {
    const { action, ...data } = event;
    const { OPENID } = wx_server_sdk_1.default.getWXContext();
    const handler = handlers[action];
    if (!handler) {
        return { error: { code: 'INVALID_ACTION', message: `Unknown action: ${action}` } };
    }
    try {
        const result = await handler({ ...data, openid: OPENID }, context);
        return { data: result };
    }
    catch (err) {
        console.error(`[user:${action}] Error:`, err);
        return {
            error: {
                code: err.code || 'INTERNAL_ERROR',
                message: err.message || '服务器内部错误',
            },
        };
    }
}
