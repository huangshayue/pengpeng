// 列出所有房间的云函数
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { action } = event
  
  try {
    const rooms = db.collection('pengpeng_rooms')
    
    switch (action) {
      case 'list':
        // 列出所有活跃房间
        const allRooms = await rooms
          .where({
            status: _.in(['waiting', 'playing'])
          })
          .orderBy('createTime', 'desc')
          .limit(20)
          .get()
        
        const roomList = allRooms.data.map(room => ({
          roomId: room.roomId,
          status: room.status,
          hasHost: !!room.host,
          hasGuest: !!room.guest,
          hostOpenId: room.host?.openId,
          guestOpenId: room.guest?.openId,
          isMyRoom: room.host?.openId === wxContext.OPENID || room.guest?.openId === wxContext.OPENID,
          createTime: room.createTime,
          updateTime: room.updateTime
        }))
        
        return {
          success: true,
          rooms: roomList,
          myOpenId: wxContext.OPENID,
          count: roomList.length
        }
        
      case 'cleanMy':
        // 清理我创建的所有房间
        const deleteResult = await rooms.where({
          'host.openId': wxContext.OPENID
        }).remove()
        
        return {
          success: true,
          message: `清理了 ${deleteResult.stats.removed} 个房间`,
          removed: deleteResult.stats.removed
        }
        
      case 'cleanOld':
        // 清理超过10分钟的旧房间
        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000)
        const cleanResult = await rooms.where({
          updateTime: _.lt(tenMinutesAgo)
        }).remove()
        
        return {
          success: true,
          message: `清理了 ${cleanResult.stats.removed} 个超时房间`,
          removed: cleanResult.stats.removed
        }
        
      default:
        return {
          success: false,
          error: '未知操作'
        }
    }
  } catch (error) {
    console.error('listRooms错误:', error)
    return {
      success: false,
      error: error.message
    }
  }
}