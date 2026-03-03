"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = main;
const wx_server_sdk_1 = __importDefault(require("wx-server-sdk"));
const list_1 = require("./handlers/list");
const create_1 = require("./handlers/create");
const join_1 = require("./handlers/join");
const leave_1 = require("./handlers/leave");
const sit_1 = require("./handlers/sit");
const stand_1 = require("./handlers/stand");
wx_server_sdk_1.default.init({ env: wx_server_sdk_1.default.DYNAMIC_CURRENT_ENV });
const handlers = {
    list: list_1.list,
    create: create_1.create,
    join: join_1.join,
    leave: leave_1.leave,
    sit: sit_1.sit,
    stand: stand_1.stand,
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
        console.error(`[room:${action}] Error:`, err);
        return {
            error: {
                code: err.code || 'INTERNAL_ERROR',
                message: err.message || '服务器内部错误',
            },
        };
    }
}
