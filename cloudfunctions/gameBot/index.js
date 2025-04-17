// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

// 机器人难度级别
const BOT_LEVELS = {
  EASY: 'easy',
  MEDIUM: 'medium',
  HARD: 'hard'
}

// 机器人决策逻辑
function getBotAction(gameState, botLevel = BOT_LEVELS.MEDIUM) {
  // 根据游戏状态生成机器人的动作
  const { playerPosition, botPosition, obstacles } = gameState

  // 基础行为：随机移动
  if (botLevel === BOT_LEVELS.EASY) {
    const actions = ['up', 'down', 'left', 'right']
    return actions[Math.floor(Math.random() * actions.length)]
  }

  // 中等难度：简单的追踪玩家
  if (botLevel === BOT_LEVELS.MEDIUM) {
    const dx = playerPosition.x - botPosition.x
    const dy = playerPosition.y - botPosition.y

    // 优先选择距离玩家较远的方向
    if (Math.abs(dx) > Math.abs(dy)) {
      return dx > 0 ? 'right' : 'left'
    } else {
      return dy > 0 ? 'down' : 'up'
    }
  }

  // 困难模式：考虑障碍物和更复杂的策略
  if (botLevel === BOT_LEVELS.HARD) {
    // 实现 A* 寻路算法或其他高级策略
    // 这里简化为改进版的追踪逻辑
    const dx = playerPosition.x - botPosition.x
    const dy = playerPosition.y - botPosition.y
    
    // 检查是否有障碍物
    const hasObstacle = (x, y) => {
      return obstacles.some(obs => obs.x === x && obs.y === y)
    }

    // 选择最佳移动方向
    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx > 0 && !hasObstacle(botPosition.x + 1, botPosition.y)) {
        return 'right'
      } else if (dx < 0 && !hasObstacle(botPosition.x - 1, botPosition.y)) {
        return 'left'
      }
    } else {
      if (dy > 0 && !hasObstacle(botPosition.x, botPosition.y + 1)) {
        return 'down'
      } else if (dy < 0 && !hasObstacle(botPosition.x, botPosition.y - 1)) {
        return 'up'
      }
    }

    // 如果最优路径被阻挡，选择其他可行方向
    const possibleMoves = []
    if (!hasObstacle(botPosition.x + 1, botPosition.y)) possibleMoves.push('right')
    if (!hasObstacle(botPosition.x - 1, botPosition.y)) possibleMoves.push('left')
    if (!hasObstacle(botPosition.x, botPosition.y + 1)) possibleMoves.push('down')
    if (!hasObstacle(botPosition.x, botPosition.y - 1)) possibleMoves.push('up')

    return possibleMoves[Math.floor(Math.random() * possibleMoves.length)] || 'stay'
  }

  return 'stay'
}

// 云函数入口函数
exports.main = async (event, context) => {
  const { action, gameState, botLevel } = event

  try {
    switch (action) {
      case 'getAction':
        const botAction = getBotAction(gameState, botLevel)
        return {
          success: true,
          action: botAction
        }

      case 'initBot':
        // 初始化机器人的状态
        return {
          success: true,
          botData: {
            level: botLevel || BOT_LEVELS.MEDIUM,
            name: 'GameBot',
            avatar: 'bot-avatar-url'  // 可以设置一个默认的机器人头像
          }
        }

      default:
        throw new Error('Unknown action')
    }
  } catch (error) {
    console.error(error)
    return {
      success: false,
      error: error.message
    }
  }
} 