// 云函数入口文件
const cloud = require('wx-server-sdk')

// 初始化云开发
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
  throwOnError: true
})

const db = cloud.database()
const _ = db.command

// 确保集合存在
async function ensureCollection() {
  try {
    // 尝试创建集合
    await db.createCollection('game_rooms')
    console.log('成功创建集合 game_rooms')
  } catch (error) {
    // 如果集合已存在，会抛出错误，这是正常的
    console.log('集合 game_rooms 已存在或创建失败:', error)
  }
}

// 云函数入口函数
exports.main = async (event, context) => {
  try {
    // 获取用户openid
    const wxContext = cloud.getWXContext()
    console.log('云函数环境:', cloud.DYNAMIC_CURRENT_ENV)
    console.log('完整的wxContext:', wxContext)
    console.log('完整的context:', context)
    
    if (!wxContext || !wxContext.OPENID) {
      console.error('无法获取用户openid')
      return {
        success: false,
        error: '无法获取用户身份信息'
      }
    }
    
    const openid = wxContext.OPENID
    console.log('用户openid:', openid)

    // 确保集合存在
    await ensureCollection()
    
    const rooms = db.collection('game_rooms')
    
    // 记录函数调用信息
    console.log('函数调用信息:', {
      action: event.action,
      openid: openid,
      roomId: event.roomId,
      env: cloud.DYNAMIC_CURRENT_ENV
    })
    
    switch (event.action) {
      case 'createRoom':
        return await createRoom(rooms, openid)
      case 'findRoom':
        return await findRoom(rooms, openid, event.roomNumber)
      case 'joinRoom':
        return await joinRoom(rooms, event.roomId, openid)
      case 'updateGameState':
        return await updateGameState(rooms, event.roomId, event.gameState)
      default:
        return {
          success: false,
          error: 'Invalid action'
        }
    }
  } catch (error) {
    console.error('gameRoom function error:', error)
    return {
      success: false,
      error: error.message || 'Unknown error occurred'
    }
  }
}

// 创建新房间
async function createRoom(rooms, openid) {
  try {
    if (!openid) {
      console.error('createRoom: openid is required')
      return {
        success: false,
        error: 'User ID is required'
      }
    }

    console.log('Creating new room for openid:', openid)
    
    // 检查玩家是否已经在其他房间中
    const existingRooms = await rooms
      .where(_.or([
        {
          'player1.openid': openid
        },
        {
          'player2.openid': openid
        }
      ]))
      .get()
    
    if (existingRooms.data && existingRooms.data.length > 0) {
      console.log('Player already in room:', existingRooms.data[0]._id)
      return {
        success: false,
        error: 'Player already in a room',
        roomId: existingRooms.data[0]._id
      }
    }
    
    // 生成6位数字的房间号
    const roomNumber = Math.floor(100000 + Math.random() * 900000).toString()
    
    // 创建新房间
    const newRoom = {
      createTime: db.serverDate(),
      status: 'waiting',    // waiting, playing, finished
      roomNumber: roomNumber,
      player1: {
        openid: openid,
        health: 100,
        qi: 0,
        isDefending: false,
        defenseType: null,
        isReady: false
      },
      player2: null,
      updateTime: db.serverDate()
    }
    
    const result = await rooms.add({
      data: newRoom
    })
    
    console.log('Room created successfully:', result)
    return {
      success: true,
      roomId: result._id,
      roomNumber: roomNumber,
      room: { ...newRoom, _id: result._id }
    }
  } catch (error) {
    console.error('Create room error:', error)
    return {
      success: false,
      error: error.message || 'Failed to create room'
    }
  }
}

// 查找房间
async function findRoom(rooms, openid, roomNumber) {
  try {
    if (!openid) {
      console.error('findRoom: openid is required')
      return {
        success: false,
        error: 'User ID is required'
      }
    }

    console.log('Finding room:', { roomNumber })
    
    // 先检查玩家是否已经在某个房间中
    const existingRooms = await rooms
      .where(_.or([
        {
          'player1.openid': openid
        },
        {
          'player2.openid': openid
        }
      ]))
      .get()
    
    console.log('检查现有房间结果:', existingRooms.data)
    
    if (existingRooms.data && existingRooms.data.length > 0) {
      const room = existingRooms.data[0]
      const playerNumber = room.player1?.openid === openid ? 1 : 2
      console.log('Player already in room:', room._id, 'as player', playerNumber)
      return {
        success: true,
        isExisting: true,
        playerNumber: playerNumber,
        rooms: [room]
      }
    }

    // 清理超时的房间（5分钟未匹配成功的房间）
    const timeoutLimit = new Date()
    timeoutLimit.setMinutes(timeoutLimit.getMinutes() - 5)
    
    try {
      const timeoutRooms = await rooms
        .where({
          status: 'waiting',
          createTime: _.lt(timeoutLimit)
        })
        .get()
      
      console.log('超时房间:', timeoutRooms.data)
      
      // 删除超时的房间
      for (const room of timeoutRooms.data) {
        await rooms.doc(room._id).remove()
        console.log('删除超时房间:', room._id)
      }
    } catch (error) {
      console.error('清理超时房间失败:', error)
    }
    
    // 根据房间号查找房间
    if (roomNumber) {
      const targetRoom = await rooms
        .where({
          roomNumber: roomNumber,
          status: 'waiting',
          player2: null
        })
        .get()
      
      console.log('查找指定房间结果:', targetRoom.data)
      
      if (targetRoom.data && targetRoom.data.length > 0) {
        return {
          success: true,
          isExisting: false,
          rooms: targetRoom.data
        }
      } else {
        return {
          success: false,
          error: 'Room not found or not available'
        }
      }
    }
    
    // 如果没有指定房间号，返回所有等待中的房间
    const availableRooms = await rooms
      .where({
        status: 'waiting',
        player2: null
      })
      .orderBy('createTime', 'asc')
      .get()
    
    console.log('可用房间列表:', availableRooms.data)
    
    return {
      success: true,
      isExisting: false,
      rooms: availableRooms.data
    }
  } catch (error) {
    console.error('Find room error:', error)
    return {
      success: false,
      error: error.message || 'Failed to find room'
    }
  }
}

// 加入房间
async function joinRoom(rooms, roomId, openid) {
  try {
    if (!roomId || !openid) {
      console.error('joinRoom: roomId and openid are required')
      return {
        success: false,
        error: 'Room ID and User ID are required'
      }
    }

    console.log('Joining room:', { roomId, openid })
    
    // 获取房间信息
    const roomQuery = await rooms.doc(roomId).get()
    if (!roomQuery.data) {
      console.error('Room not found:', roomId)
      return {
        success: false,
        error: 'Room not found'
      }
    }
    
    const room = roomQuery.data
    console.log('Found room:', room)
    
    // 检查房间状态
    if (room.status !== 'waiting') {
      console.error('Room is not available:', room.status)
      return {
        success: false,
        error: 'Room is not available'
      }
    }
    
    // 检查是否是房主
    if (room.player1?.openid === openid) {
      console.log('Player is room owner')
      return {
        success: true,
        isOwner: true,
        room: room
      }
    }
    
    // 检查是否已经加入
    if (room.player2?.openid === openid) {
      console.log('Player already joined')
      return {
        success: true,
        isJoined: true,
        room: room
      }
    }
    
    // 使用事务来更新房间状态，确保原子性
    try {
      const result = await db.runTransaction(async transaction => {
        // 再次检查房间状态
        const currentRoom = await transaction.get(rooms.doc(roomId))
        
        if (!currentRoom.data || 
            currentRoom.data.status !== 'waiting' || 
            currentRoom.data.player2) {
          throw new Error('Room is no longer available')
        }
        
        // 更新房间状态
        await transaction.update(rooms.doc(roomId), {
          status: 'waiting', // 保持等待状态
          player2: {
            openid: openid,
            health: 100,
            qi: 0,
            isDefending: false,
            defenseType: null,
            isReady: false
          },
          updateTime: db.serverDate()
        })
        
        return currentRoom.data
      })
      
      // 获取更新后的房间数据
      const updatedRoom = await rooms.doc(roomId).get()
      console.log('Successfully joined room:', updatedRoom.data)
      
      return {
        success: true,
        room: updatedRoom.data
      }
    } catch (error) {
      console.error('Transaction failed:', error)
      return {
        success: false,
        error: 'Failed to join room: ' + error.message
      }
    }
  } catch (error) {
    console.error('Join room error:', error)
    return {
      success: false,
      error: error.message || 'Failed to join room'
    }
  }
}

// 更新游戏状态
async function updateGameState(rooms, roomId, gameState) {
  try {
    console.log('Updating game state:', { roomId, gameState })
    
    // 获取当前房间状态
    const roomQuery = await rooms.doc(roomId).get()
    if (!roomQuery.data) {
      throw new Error('Room not found')
    }
    
    const room = roomQuery.data
    
    // 检查是否两个玩家都已加入
    if (!room.player1 || !room.player2) {
      throw new Error('Not all players have joined yet')
    }
    
    // 检查玩家是否都已准备
    const player1Ready = gameState.player1?.isReady || false
    const player2Ready = gameState.player2?.isReady || false
    
    console.log('玩家准备状态:', { player1Ready, player2Ready })
    
    if (player1Ready && player2Ready) {
      // 两个玩家都准备好了，更新房间状态为playing
      await rooms.doc(roomId).update({
        data: {
          status: 'playing',
          player1: {
            ...room.player1,
            ...gameState.player1,
            isReady: true
          },
          player2: {
            ...room.player2,
            ...gameState.player2,
            isReady: true
          },
          updateTime: db.serverDate()
        }
      })
      console.log('游戏开始，房间状态更新为playing')
    } else {
      // 更新玩家状态但保持房间状态为waiting
      await rooms.doc(roomId).update({
        data: {
          player1: {
            ...room.player1,
            ...gameState.player1
          },
          player2: {
            ...room.player2,
            ...gameState.player2
          },
          updateTime: db.serverDate()
        }
      })
      console.log('更新玩家状态，保持房间状态为waiting')
    }
    
    return {
      success: true
    }
  } catch (error) {
    console.error('Update game state error:', error)
    return {
      success: false,
      error: error.message
    }
  }
} 