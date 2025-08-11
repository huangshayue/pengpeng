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
  console.log('创建房间请求:', { roomId, playerId, openId })
  const rooms = db.collection('pengpeng_rooms')
  
  // 检查房间是否已存在
  const existingRoom = await rooms.where({
    roomId: roomId
  }).get()
  
  console.log('查找已存在房间结果:', existingRoom.data.length)
  
  if (existingRoom.data.length > 0) {
    // 如果房间已存在，检查是否是同一个房主
    const room = existingRoom.data[0]
    console.log('房间已存在，检查房主:', room.host?.openId, '当前用户:', openId)
    
    if (room.host && room.host.openId === openId) {
      // 是同一个房主，更新房间信息
      console.log('同一房主重新创建房间')
      await rooms.doc(room._id).update({
        data: {
          host: {
            playerId: playerId,
            openId: openId,
            joinTime: new Date()
          },
          guest: null,  // 清空访客，重新等待
          status: 'waiting',
          updateTime: new Date(),
          messages: []
        }
      })
    } else {
      // 不是同一个房主，房间号冲突，生成新的房间号
      console.log('房间号冲突，需要生成新的房间号')
      return {
        success: false,
        error: '房间号已被占用，请重试'
      }
    }
  } else {
    // 创建新房间
    console.log('创建新房间')
    const result = await rooms.add({
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
    console.log('房间创建成功:', result._id)
  }
  
  return {
    success: true,
    roomId: roomId
  }
}

// 加入房间
async function joinRoom(roomId, playerId, openId) {
  console.log('尝试加入房间:', { roomId, playerId, openId })
  const rooms = db.collection('pengpeng_rooms')
  
  // 先查找所有匹配的房间（不限制状态）
  const allRooms = await rooms.where({
    roomId: roomId
  }).get()
  
  console.log('找到的房间数量:', allRooms.data.length)
  if (allRooms.data.length > 0) {
    console.log('房间信息:', {
      roomId: allRooms.data[0].roomId,
      hostOpenId: allRooms.data[0].host?.openId,
      guestOpenId: allRooms.data[0].guest?.openId,
      status: allRooms.data[0].status,
      currentOpenId: openId
    })
  }
  
  if (allRooms.data.length === 0) {
    return {
      success: false,
      error: '房间不存在'
    }
  }
  
  // 查找waiting状态的房间
  const waitingRooms = allRooms.data.filter(r => r.status === 'waiting')
  console.log('等待中的房间数量:', waitingRooms.length)
  
  if (waitingRooms.length === 0) {
    const room = allRooms.data[0]
    if (room.status === 'playing') {
      return {
        success: false,
        error: '房间正在游戏中'
      }
    } else if (room.status === 'ended') {
      return {
        success: false,
        error: '房间已结束'
      }
    } else {
      return {
        success: false,
        error: '房间状态异常: ' + room.status
      }
    }
  }
  
  const roomData = waitingRooms[0]
  
  // 检查是否是房主重新加入
  if (roomData.host && roomData.host.openId === openId) {
    console.log('房主重新加入自己的房间')
    return {
      success: true,
      isHost: true
    }
  }
  
  // 检查是否已经有访客
  if (roomData.guest && roomData.guest.openId === openId) {
    console.log('访客重新加入房间')
    return {
      success: true,
      isHost: false,
      isReconnect: true
    }
  }
  
  // 检查房间是否已满
  if (roomData.guest) {
    console.log('房间已满')
    return {
      success: false,
      error: '房间已满'
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
      status: 'waiting',  // 保持waiting状态，直到游戏真正开始
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