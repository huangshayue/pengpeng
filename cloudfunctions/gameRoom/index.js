// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

// 云函数入口函数
exports.main = async (event, context) => {
  const { action, roomId, gameState, playerData } = event
  const wxContext = cloud.getWXContext()
  const openId = wxContext.OPENID

  try {
    switch (action) {
      case 'createRoom':
        // 创建新房间
        const room = {
          creator: openId,
          player1: openId,
          player2: null,
          status: 'waiting',
          gameState: {},
          createTime: db.serverDate(),
          updateTime: db.serverDate()
        }
        const result = await db.collection('game_rooms').add({
          data: room
        })
        return {
          success: true,
          roomId: result._id,
          playerNumber: 1
        }

      case 'joinRoom':
        // 加入房间
        const roomData = await db.collection('game_rooms')
          .doc(roomId)
          .get()
        
        if (!roomData.data) {
          throw new Error('Room not found')
        }

        if (roomData.data.status !== 'waiting') {
          throw new Error('Room is full or game already started')
        }

        await db.collection('game_rooms').doc(roomId).update({
          data: {
            player2: openId,
            status: 'playing',
            updateTime: db.serverDate()
          }
        })

        return {
          success: true,
          playerNumber: 2
        }

      case 'updateGameState':
        // 更新游戏状态
        await db.collection('game_rooms').doc(roomId).update({
          data: {
            gameState: gameState,
            updateTime: db.serverDate()
          }
        })
        return {
          success: true
        }

      case 'findRoom':
        // 查找可加入的房间
        const rooms = await db.collection('game_rooms')
          .where({
            status: 'waiting',
            player2: null
          })
          .limit(1)
          .get()

        return {
          success: true,
          rooms: rooms.data
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