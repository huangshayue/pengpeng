// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

// 机器人难度设置
const BOT_LEVELS = {
  easy: {
    reactionTime: 1000,
    accuracy: 0.6
  },
  medium: {
    reactionTime: 700,
    accuracy: 0.8
  },
  hard: {
    reactionTime: 400,
    accuracy: 0.95
  }
}

// 云函数入口函数
exports.main = async (event, context) => {
  console.log('gameBot function called with event:', event)
  
  const { action, botLevel = 'medium', gameState } = event
  
  switch (action) {
    case 'initBot':
      return initBot(botLevel)
    case 'getAction':
      return getBotAction(botLevel, gameState)
    default:
      return {
        success: false,
        error: 'Invalid action'
      }
  }
}

// 初始化机器人
async function initBot(botLevel) {
  try {
    const botSettings = BOT_LEVELS[botLevel] || BOT_LEVELS.medium
    
    return {
      success: true,
      botData: {
        level: botLevel,
        settings: botSettings
      }
    }
  } catch (error) {
    console.error('Init bot error:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

// 获取机器人动作
async function getBotAction(botLevel, gameState) {
  try {
    const botSettings = BOT_LEVELS[botLevel] || BOT_LEVELS.medium
    
    // 这里可以根据游戏状态和难度实现AI逻辑
    // 目前使用简单的随机逻辑作为示例
    const actions = ['up', 'down', 'left', 'right', 'stay']
    const randomAction = actions[Math.floor(Math.random() * actions.length)]
    
    // 模拟反应时间
    await new Promise(resolve => setTimeout(resolve, botSettings.reactionTime))
    
    // 根据准确率决定是否返回随机动作或保持不动
    const useRandomAction = Math.random() < botSettings.accuracy
    
    return {
      success: true,
      action: useRandomAction ? randomAction : 'stay'
    }
  } catch (error) {
    console.error('Get bot action error:', error)
    return {
      success: false,
      error: error.message,
      action: 'stay' // 发生错误时的默认动作
    }
  }
} 