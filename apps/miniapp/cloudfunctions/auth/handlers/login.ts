import cloud from 'wx-server-sdk'
import { Collections, INITIAL_CHIPS } from '../shared/constants'
import { generateShortId } from '../shared/utils/helpers'
import { AppError } from '../shared/utils/response'

const getDb = () => cloud.database()

interface LoginParams {
  openid: string
  userInfo?: { nickName: string; avatarUrl: string }
}

export async function login(params: LoginParams) {
  const { openid, userInfo } = params

  const db = getDb()

  const userResult = await db
    .collection(Collections.USERS)
    .where({ openid })
    .limit(1)
    .get() as any

  // 已有用户 → 更新登录时间
  if (userResult.data.length > 0) {
    const user = userResult.data[0]
    const updateData: Record<string, any> = {
      lastLoginAt: db.serverDate(),
    }
    if (userInfo) {
      updateData.name = userInfo.nickName
      updateData.avatar = userInfo.avatarUrl
    }
    await db.collection(Collections.USERS).doc(user._id).update({ data: updateData })
    return { user: { ...user, ...updateData }, isNewUser: false }
  }

  // 新用户 → 注册
  const newUser = {
    openid,
    name: userInfo?.nickName || `玩家${generateShortId()}`,
    avatar: userInfo?.avatarUrl || '',
    chips: INITIAL_CHIPS,
    consecutiveCheckins: 0,
    lastCheckinDate: null,
    createdAt: db.serverDate(),
    lastLoginAt: db.serverDate(),
  }

  const result = await db.collection(Collections.USERS).add({ data: newUser }) as any

  // 初始化统计记录
  await db.collection(Collections.USER_STATISTICS).add({
    data: {
      userId: result._id,
      totalGames: 0,
      wins: 0,
      totalWinnings: 0,
      totalLosses: 0,
      biggestWin: 0,
      biggestLoss: 0,
      createdAt: db.serverDate(),
      updatedAt: db.serverDate(),
    },
  })

  return { user: { _id: result._id, ...newUser }, isNewUser: true }
}
