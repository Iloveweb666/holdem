import cloud from 'wx-server-sdk'
import { Collections } from '../shared/constants'
import { AppError } from '../shared/utils/response'

const getDb = () => cloud.database()

interface UpdateProfileParams {
  openid: string
  name?: string
  avatar?: string
}

export async function updateProfile(params: UpdateProfileParams) {
  const { openid, name, avatar } = params
  const db = getDb()

  const userResult = await db
    .collection(Collections.USERS)
    .where({ openid })
    .limit(1)
    .get() as any

  if (userResult.data.length === 0) {
    throw new AppError('USER_NOT_FOUND', '用户不存在')
  }

  const user = userResult.data[0]
  const updateData: Record<string, any> = {}

  if (name !== undefined) {
    if (name.length < 1 || name.length > 20) {
      throw new AppError('INVALID_NAME', '昵称长度应在 1-20 个字符之间')
    }
    updateData.name = name
  }

  if (avatar !== undefined) {
    updateData.avatar = avatar
  }

  if (Object.keys(updateData).length === 0) {
    return { user }
  }

  await db.collection(Collections.USERS).doc(user._id).update({ data: updateData })

  return { user: { ...user, ...updateData } }
}
