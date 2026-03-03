import { ROOM_CODE_LENGTH } from '../constants'

/** 生成随机房间号（纯数字） */
export function generateRoomCode(): string {
  const max = Math.pow(10, ROOM_CODE_LENGTH)
  const min = Math.pow(10, ROOM_CODE_LENGTH - 1)
  return String(Math.floor(Math.random() * (max - min)) + min)
}

/** 生成随机短 ID（用于昵称后缀等） */
export function generateShortId(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

/** 获取今天零点 Date */
export function getTodayStart(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

/** 获取昨天零点 Date */
export function getYesterdayStart(): Date {
  const d = getTodayStart()
  d.setDate(d.getDate() - 1)
  return d
}

/** 判断两个日期是否为同一天 */
export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}
