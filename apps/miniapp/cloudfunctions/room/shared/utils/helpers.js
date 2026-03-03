"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateRoomCode = generateRoomCode;
exports.generateShortId = generateShortId;
exports.getTodayStart = getTodayStart;
exports.getYesterdayStart = getYesterdayStart;
exports.isSameDay = isSameDay;
const constants_1 = require("../constants");
/** 生成随机房间号（纯数字） */
function generateRoomCode() {
    const max = Math.pow(10, constants_1.ROOM_CODE_LENGTH);
    const min = Math.pow(10, constants_1.ROOM_CODE_LENGTH - 1);
    return String(Math.floor(Math.random() * (max - min)) + min);
}
/** 生成随机短 ID（用于昵称后缀等） */
function generateShortId() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}
/** 获取今天零点 Date */
function getTodayStart() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
}
/** 获取昨天零点 Date */
function getYesterdayStart() {
    const d = getTodayStart();
    d.setDate(d.getDate() - 1);
    return d;
}
/** 判断两个日期是否为同一天 */
function isSameDay(a, b) {
    return (a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate());
}
