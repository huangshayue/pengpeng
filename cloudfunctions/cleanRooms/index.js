// 清理超时房间的云函数
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

// 云函数入口函数
exports.main = async (event, context) => {
  try {
    const rooms = db.collection('pengpeng_rooms')
    
    // 获取5分钟前的时间
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
    
    // 删除超过5分钟没有更新的房间
    const result = await rooms.where({
      updateTime: _.lt(fiveMinutesAgo)
    }).remove()
    
    console.log('清理房间结果:', result)
    
    return {
      success: true,
      removed: result.stats.removed,
      message: `清理了 ${result.stats.removed} 个超时房间`
    }
  } catch (error) {
    console.error('清理房间错误:', error)
    return {
      success: false,
      error: error.message
    }
  }
}