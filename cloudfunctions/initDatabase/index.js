// 初始化数据库的云函数
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  try {
    console.log('开始初始化数据库...')
    
    // 创建 pengpeng_rooms 集合
    // 注意：在云函数中不能直接创建集合，需要通过添加第一条数据来创建
    const rooms = db.collection('pengpeng_rooms')
    
    // 尝试查询集合，如果不存在会报错
    try {
      const result = await rooms.limit(1).get()
      console.log('集合已存在，当前数据数量:', result.data.length)
      
      // 清理超时的房间（可选）
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
      const cleanResult = await rooms.where({
        updateTime: db.command.lt(fiveMinutesAgo)
      }).remove()
      
      return {
        success: true,
        message: '数据库集合已存在',
        roomCount: result.data.length,
        cleaned: cleanResult.stats.removed
      }
    } catch (error) {
      // 集合不存在，创建一个初始文档
      console.log('集合不存在，创建初始文档...')
      
      const initDoc = await rooms.add({
        data: {
          roomId: '000000',  // 初始房间号
          host: null,
          guest: null,
          status: 'init',    // 初始状态
          messages: [],
          createTime: new Date(),
          updateTime: new Date(),
          isInit: true      // 标记为初始文档
        }
      })
      
      console.log('初始文档创建成功:', initDoc._id)
      
      // 立即删除初始文档（可选）
      // await rooms.doc(initDoc._id).remove()
      
      return {
        success: true,
        message: '数据库集合创建成功',
        initDocId: initDoc._id
      }
    }
  } catch (error) {
    console.error('初始化数据库错误:', error)
    return {
      success: false,
      error: error.message,
      stack: error.stack
    }
  }
}