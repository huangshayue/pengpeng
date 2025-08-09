// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

// 云函数入口函数
exports.main = async (event, context) => {
  console.log('test cloud function called with event:', event)
  
  return {
    success: true,
    message: 'Cloud function test successful',
    event: event,
    requestTime: new Date().toISOString()
  }
} 