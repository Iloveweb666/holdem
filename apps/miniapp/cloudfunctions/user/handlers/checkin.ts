import cloud from 'wx-server-sdk'
import { Collections, CHECKIN_REWARDS } from '../shared/constants'
import { getTodayStart, getYesterdayStart, isSameDay } from '../shared/utils/helpers'
import { AppError } from '../shared/utils/response'

const getDb = () => cloud.database()

interface CheckinParams {
  openid: string
}

export async function checkin(params: CheckinParams) {
  const { openid } = params
  const db = getDb()
  const _ = db.command

  const userResult = await db
    .collection(Collections.USERS)
    .where({ openid })
    .limit(1)
    .get() as any

  if (userResult.data.length === 0) {
    throw new AppError('USER_NOT_FOUND', '用户不存在')
  }

  const user = userResult.data[0]
  const today = getTodayStart()

  // 检查今日是否已签到
  if (user.lastCheckinDate) {
    const lastCheckin = new Date(user.lastCheckinDate)
    if (isSameDay(lastCheckin, today)) {
      throw new AppError('ALREADY_CHECKED_IN', '今日已签到')
    }
  }

  // 计算连续签到天数
  let consecutiveDays = 1
  if (user.lastCheckinDate) {
    const yesterday = getYesterdayStart()
    const lastCheckin = new Date(user.lastCheckinDate)
    lastCheckin.setHours(0, 0, 0, 0)

    if (isSameDay(lastCheckin, yesterday)) {
      consecutiveDays = user.consecutiveCheckins + 1
    }
    // 否则断签，重置为 1
  }

  // 计算奖励（循环使用 7 天奖励表）
  const rewardIndex = ((consecutiveDays - 1) % CHECKIN_REWARDS.length)
  const reward = CHECKIN_REWARDS[rewardIndex]

  // 更新用户
  await db.collection(Collections.USERS).doc(user._id).update({
    data: {
      chips: _.inc(reward),
      consecutiveCheckins: consecutiveDays,
      lastCheckinDate: db.serverDate(),
    },
  })

  return {
    reward,
    consecutiveDays,
    totalChips: user.chips + reward,
  }
}
