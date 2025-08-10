// 调试房间状态的云函数
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const { roomId } = event
  
  try {
    const rooms = db.collection('pengpeng_rooms')
    
    if (roomId) {
      // 查询特定房间
      const result = await rooms.where({
        roomId: roomId
      }).get()
      
      return {
        success: true,
        rooms: result.data,
        count: result.data.length
      }
    } else {
      // 查询所有房间
      const result = await rooms.limit(20).orderBy('createTime', 'desc').get()
      
      return {
        success: true,
        rooms: result.data,
        count: result.data.length
      }
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}