// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { action, roomId, playerId, message } = event
  
  console.log('gameRoom云函数被调用:', { action, roomId, playerId })
  
  try {
    switch (action) {
      case 'create':
        return await createRoom(roomId, playerId, wxContext.OPENID)
        
      case 'join':
        return await joinRoom(roomId, playerId, wxContext.OPENID)
        
      case 'send':
        return await sendMessage(roomId, message)
        
      case 'poll':
        return await pollMessages(roomId, playerId)
        
      case 'leave':
        return await leaveRoom(roomId, playerId)
        
      default:
        return {
          success: false,
          error: '未知的操作类型'
        }
    }
  } catch (error) {
    console.error('云函数错误:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

// 创建房间
async function createRoom(roomId, playerId, openId) {
  const rooms = db.collection('pengpeng_rooms')
  
  // 检查房间是否已存在
  const existingRoom = await rooms.where({
    roomId: roomId
  }).get()
  
  if (existingRoom.data.length > 0) {
    // 如果房间已存在，更新房间信息
    await rooms.doc(existingRoom.data[0]._id).update({
      data: {
        host: {
          playerId: playerId,
          openId: openId,
          joinTime: new Date()
        },
        status: 'waiting',
        updateTime: new Date()
      }
    })
  } else {
    // 创建新房间
    await rooms.add({
      data: {
        roomId: roomId,
        host: {
          playerId: playerId,
          openId: openId,
          joinTime: new Date()
        },
        guest: null,
        status: 'waiting', // waiting, playing, ended
        messages: [],
        createTime: new Date(),
        updateTime: new Date()
      }
    })
  }
  
  return {
    success: true,
    roomId: roomId
  }
}

// 加入房间
async function joinRoom(roomId, playerId, openId) {
  const rooms = db.collection('pengpeng_rooms')
  
  // 查找房间
  const room = await rooms.where({
    roomId: roomId,
    status: 'waiting'
  }).get()
  
  if (room.data.length === 0) {
    return {
      success: false,
      error: '房间不存在或已开始游戏'
    }
  }
  
  const roomData = room.data[0]
  
  // 检查是否是房主重新加入
  if (roomData.host && roomData.host.openId === openId) {
    return {
      success: true,
      isHost: true
    }
  }
  
  // 更新房间，添加访客
  await rooms.doc(roomData._id).update({
    data: {
      guest: {
        playerId: playerId,
        openId: openId,
        joinTime: new Date()
      },
      status: 'playing',
      updateTime: new Date(),
      // 添加玩家加入消息
      messages: _.push({
        type: 'playerJoined',
        playerId: playerId,
        timestamp: new Date()
      })
    }
  })
  
  return {
    success: true,
    isHost: false
  }
}

// 发送消息
async function sendMessage(roomId, message) {
  const rooms = db.collection('pengpeng_rooms')
  
  // 查找房间
  const room = await rooms.where({
    roomId: roomId
  }).get()
  
  if (room.data.length === 0) {
    return {
      success: false,
      error: '房间不存在'
    }
  }
  
  // 添加消息到房间
  await rooms.doc(room.data[0]._id).update({
    data: {
      messages: _.push({
        ...message,
        timestamp: new Date()
      }),
      updateTime: new Date()
    }
  })
  
  return {
    success: true
  }
}

// 轮询消息
async function pollMessages(roomId, playerId) {
  const rooms = db.collection('pengpeng_rooms')
  
  // 查找房间
  const room = await rooms.where({
    roomId: roomId
  }).get()
  
  if (room.data.length === 0) {
    return {
      success: false,
      error: '房间不存在'
    }
  }
  
  const roomData = room.data[0]
  const messages = roomData.messages || []
  
  // 获取最近的消息（最多返回最新的10条）
  const recentMessages = messages.slice(-10)
  
  // 清理已读消息（保留最新的20条）
  if (messages.length > 20) {
    await rooms.doc(roomData._id).update({
      data: {
        messages: messages.slice(-20)
      }
    })
  }
  
  return {
    success: true,
    messages: recentMessages,
    roomStatus: roomData.status,
    hasOpponent: roomData.guest !== null
  }
}

// 离开房间
async function leaveRoom(roomId, playerId) {
  const rooms = db.collection('pengpeng_rooms')
  
  // 查找房间
  const room = await rooms.where({
    roomId: roomId
  }).get()
  
  if (room.data.length === 0) {
    return {
      success: false,
      error: '房间不存在'
    }
  }
  
  const roomData = room.data[0]
  
  // 判断是房主还是访客离开
  const isHost = roomData.host && roomData.host.playerId === playerId
  const isGuest = roomData.guest && roomData.guest.playerId === playerId
  
  if (isHost) {
    // 房主离开，结束游戏
    await rooms.doc(roomData._id).update({
      data: {
        status: 'ended',
        messages: _.push({
          type: 'playerLeft',
          playerId: playerId,
          timestamp: new Date()
        }),
        updateTime: new Date()
      }
    })
  } else if (isGuest) {
    // 访客离开
    await rooms.doc(roomData._id).update({
      data: {
        guest: null,
        status: 'waiting',
        messages: _.push({
          type: 'playerLeft',
          playerId: playerId,
          timestamp: new Date()
        }),
        updateTime: new Date()
      }
    })
  }
  
  return {
    success: true
  }
}