"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.list = list;
const wx_server_sdk_1 = __importDefault(require("wx-server-sdk"));
const constants_1 = require("../shared/constants");
const getDb = () => wx_server_sdk_1.default.database();
async function list(params) {
    const { search, status } = params;
    const db = getDb();
    const _ = db.command;
    let where = { deletedAt: null };
    if (status) {
        where.status = status;
    }
    else {
        where.status = _.in(['WAITING', 'PLAYING']);
    }
    // 获取房间列表
    let query = db.collection(constants_1.Collections.ROOMS).where(where);
    const roomsResult = await query
        .orderBy('createdAt', 'desc')
        .limit(50)
        .get();
    let rooms = roomsResult.data;
    // 如果有搜索关键词，在应用层过滤（云数据库 RegExp 对复合条件支持有限）
    if (search) {
        rooms = rooms.filter((r) => r.name.includes(search) || r.code === search);
    }
    // 批量获取每个房间的玩家数量
    const roomsWithCount = await Promise.all(rooms.map(async (room) => {
        const countResult = await db
            .collection(constants_1.Collections.ROOM_PLAYERS)
            .where({ roomId: room._id })
            .count();
        return {
            _id: room._id,
            name: room.name,
            code: room.code,
            bigBlind: room.bigBlind,
            smallBlind: room.smallBlind,
            maxPlayers: room.maxPlayers,
            status: room.status,
            currentPlayers: countResult.total,
            createdAt: room.createdAt,
        };
    }));
    return { rooms: roomsWithCount };
}
