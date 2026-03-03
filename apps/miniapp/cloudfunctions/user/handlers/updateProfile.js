"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProfile = updateProfile;
const wx_server_sdk_1 = __importDefault(require("wx-server-sdk"));
const constants_1 = require("../shared/constants");
const response_1 = require("../shared/utils/response");
const getDb = () => wx_server_sdk_1.default.database();
async function updateProfile(params) {
    const { openid, name, avatar } = params;
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
    const updateData = {};
    if (name !== undefined) {
        if (name.length < 1 || name.length > 20) {
            throw new response_1.AppError('INVALID_NAME', '昵称长度应在 1-20 个字符之间');
        }
        updateData.name = name;
    }
    if (avatar !== undefined) {
        updateData.avatar = avatar;
    }
    if (Object.keys(updateData).length === 0) {
        return { user };
    }
    await db.collection(constants_1.Collections.USERS).doc(user._id).update({ data: updateData });
    return { user: { ...user, ...updateData } };
}
