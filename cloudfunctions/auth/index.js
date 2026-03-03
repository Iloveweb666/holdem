"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = main;
const wx_server_sdk_1 = __importDefault(require("wx-server-sdk"));
const login_1 = require("./handlers/login");
const getUser_1 = require("./handlers/getUser");
wx_server_sdk_1.default.init({ env: wx_server_sdk_1.default.DYNAMIC_CURRENT_ENV });
const handlers = {
    login: login_1.login,
    getUser: getUser_1.getUser,
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
        console.error(`[auth:${action}] Error:`, err);
        return {
            error: {
                code: err.code || 'INTERNAL_ERROR',
                message: err.message || '服务器内部错误',
            },
        };
    }
}
