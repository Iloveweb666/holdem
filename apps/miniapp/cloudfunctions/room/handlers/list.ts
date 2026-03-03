import cloud from 'wx-server-sdk'
import { Collections } from '../shared/constants'

const getDb = () => cloud.database()

interface ListParams {
  openid: string
  search?: string
  status?: string
}

export async function list(params: ListParams) {
  const { search, status } = params
  const db = getDb()
  const _ = db.command

  let where: any = { deletedAt: null }

  if (status) {
    where.status = status
  } else {
    where.status = _.in(['WAITING', 'PLAYING'])
  }

  // 获取房间列表
  let query = db.collection(Collections.ROOMS).where(where)

  const roomsResult = await query
    .orderBy('createdAt', 'desc')
    .limit(50)
    .get() as any

  let rooms = roomsResult.data

  // 如果有搜索关键词，在应用层过滤（云数据库 RegExp 对复合条件支持有限）
  if (search) {
    rooms = rooms.filter(
      (r: any) =>
        r.name.includes(search) || r.code === search
    )
  }

  // 批量获取每个房间的玩家数量
  const roomsWithCount = await Promise.all(
    rooms.map(async (room: any) => {
      const countResult = await db
        .collection(Collections.ROOM_PLAYERS)
        .where({ roomId: room._id })
        .count() as any
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
      }
    })
  )

  return { rooms: roomsWithCount }
}
