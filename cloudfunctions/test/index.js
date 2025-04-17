// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

// 云函数入口函数
exports.main = async (event, context) => {
  try {
    return {
      success: true,
      message: 'Cloud function test successful',
      data: event,
      requestContext: context
    }
  } catch (error) {
    console.error('Cloud function error:', error)
    return {
      success: false,
      error: error.message
    }
  }
} 