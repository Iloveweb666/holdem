"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppError = void 0;
exports.success = success;
exports.error = error;
/** 云函数成功响应 */
function success(data) {
    return { data };
}
/** 云函数错误响应 */
function error(code, message) {
    return { error: { code, message } };
}
/** 业务异常 */
class AppError extends Error {
    constructor(code, message) {
        super(message);
        this.code = code;
    }
}
exports.AppError = AppError;
