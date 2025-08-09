// 定义消息类型
export const MessageType = {
    JOIN_GAME: 'joinGame',           // 加入游戏
    PLAYER_ACTION: 'playerAction',   // 玩家动作
    GAME_STATE: 'gameState',         // 游戏状态
    PLAYER_READY: 'playerReady',     // 玩家准备
    GAME_START: 'gameStart',         // 游戏开始
    GAME_OVER: 'gameOver',          // 游戏结束
    BOT_MODE: 'botMode'             // 机器人模式
};

export default class NetworkManager {
    constructor(gameScene) {
        console.log('NetworkManager constructor')
        this.gameScene = gameScene;
        this.isConnected = false;
        this.playerNumber = 0; // 0: 未分配, 1: 玩家1, 2: 玩家2
        this.roomId = '';
        this.isBotMode = false;
        this.botLevel = 'medium';
        this.botData = null;
        
        // 初始化云开发
        if (!wx.cloud) {
            console.error('请使用 2.2.3 或以上的基础库以使用云能力')
            return
        }
        
        try {
            // 获取当前环境ID
            const envId = wx.getStorageSync('cloud_env_id') || 'cloud1-2ghmqnl5aabc85cc';
            
            wx.cloud.init({
                env: envId,
                traceUser: true
            });
            console.log('云开发初始化成功，环境ID:', envId)
            
            this.db = wx.cloud.database({
                env: envId
            });
            this._ = this.db.command;
            this.rooms = this.db.collection('game_rooms');
            this.watchRef = null;
        } catch (error) {
            console.error('云开发初始化失败:', error)
            wx.showToast({
                title: '云开发初始化失败',
                icon: 'none'
            })
        }
    }

    // 调用云函数的通用方法
    async callCloudFunction(name, data) {
        console.log(`调用云函数 ${name}:`, data)
        try {
            // 确保已经初始化
            if (!this.isConnected) {
                await this.connect();
            }

            const result = await wx.cloud.callFunction({
                name,
                data,
                config: {
                    env: this.db.config.env
                }
            });
            console.log(`云函数 ${name} 返回结果:`, result)
            if (!result?.result) {
                throw new Error(`云函数 ${name} 返回结果无效`);
            }
            return result;
        } catch (error) {
            console.error(`云函数 ${name} 调用失败:`, error)
            throw error;
        }
    }

    // 连接到服务器（在云开发中，这变成了初始化过程）
    async connect() {
        try {
            // 测试数据库连接
            await this.db.collection('game_rooms').limit(1).get();
            this.isConnected = true;
            console.log('云开发连接成功');
            return Promise.resolve();
        } catch (error) {
            console.error('云开发连接失败:', error);
            this.isConnected = false;
            wx.showModal({
                title: '连接失败',
                content: '无法连接到云服务，请检查网络并重试',
                showCancel: false
            });
            return Promise.reject(error);
        }
    }

    // 开始机器人对战模式
    async startBotMode(botLevel = 'medium') {
        try {
            this.isBotMode = true;
            this.botLevel = botLevel;
            this.playerNumber = 1;  // 玩家永远是玩家1，机器人是玩家2

            // 初始化机器人
            const { result } = await wx.cloud.callFunction({
                name: 'gameBot',
                data: {
                    action: 'initBot',
                    botLevel: this.botLevel
                }
            });

            if (result.success) {
                this.botData = result.botData;
                // 通知游戏场景
                this.gameScene.setPlayerNumber(this.playerNumber);
                this.gameScene.setBotData(this.botData);
                this.gameScene.startGame();
            }

        } catch (error) {
            console.error('启动机器人模式失败:', error);
            wx.showToast({
                title: '启动AI对战失败',
                icon: 'none'
            });
        }
    }

    // 获取机器人的动作
    async getBotAction(gameState) {
        try {
            const { result } = await wx.cloud.callFunction({
                name: 'gameBot',
                data: {
                    action: 'getAction',
                    gameState: gameState,
                    botLevel: this.botLevel
                }
            });

            if (result.success) {
                return result.action;
            }
        } catch (error) {
            console.error('获取机器人动作失败:', error);
            return 'stay';  // 默认动作
        }
    }

    // 加入游戏
    async joinGame() {
        console.log('开始加入游戏，模式:', this.isBotMode ? 'Bot模式' : '在线模式')
        
        if (this.isBotMode) {
            return this.startBotMode(this.botLevel);
        }

        let retryCount = 0;
        const maxRetries = 3;
        const retryDelay = 1000; // 1秒重试间隔

        const tryJoinGame = async () => {
            try {
                // 显示加载提示
                wx.showLoading({
                    title: '正在匹配...',
                    mask: true
                });

                // 先测试云函数是否可用
                await this.callCloudFunction('test', { message: 'test before join' });
                
                console.log('查找可用房间...')
                // 查找可用房间
                const findResult = await this.callCloudFunction('gameRoom', { 
                    action: 'findRoom' 
                });
                console.log('完整的findResult:', findResult);

                if (!findResult?.result) {
                    throw new Error('查找房间失败：无效的返回结果');
                }

                const { result } = findResult;
                console.log('查找房间结果:', result);

                if (!result.success) {
                    throw new Error(result.error || '查找房间失败');
                }

                // 如果玩家已经在房间中
                if (result.isExisting && result.rooms && result.rooms.length > 0) {
                    const existingRoom = result.rooms[0];
                    console.log('现有房间数据:', existingRoom);
                    
                    if (!existingRoom?._id) {
                        throw new Error('房间数据无效');
                    }

                    this.roomId = existingRoom._id;
                    this.playerNumber = result.playerNumber;
                    console.log('已在房间中，玩家编号:', this.playerNumber);
                    
                    // 开始监听房间变化
                    await this.startWatchingRoom();
                    
                    wx.hideLoading();
                    if (existingRoom.status === 'waiting') {
                        wx.showToast({
                            title: '等待对手加入...',
                            icon: 'none',
                            duration: 2000
                        });
                    } else if (existingRoom.status === 'playing') {
                        wx.showToast({
                            title: '对局进行中',
                            icon: 'success',
                            duration: 1500
                        });
                        // 通知游戏场景
                        this.gameScene.setPlayerNumber(this.playerNumber);
                        this.gameScene.startGame();
                    }
                    return true;
                }

                // 尝试加入或创建房间
                if (result.rooms && result.rooms.length > 0) {
                    const room = result.rooms[0];
                    console.log('准备加入的房间:', room);
                    
                    if (!room?._id) {
                        throw new Error('房间数据无效');
                    }
                    
                    // 加入现有房间
                    const joinResult = await this.callCloudFunction('gameRoom', {
                        action: 'joinRoom',
                        roomId: room._id
                    });
                    console.log('加入房间结果:', joinResult);

                    if (!joinResult?.result) {
                        throw new Error('加入房间失败：无效的返回结果');
                    }

                    const joinData = joinResult.result;
                    if (!joinData.success) {
                        // 如果加入失败，可能是房间已被其他玩家加入
                        console.log('加入房间失败:', joinData.error);
                        if (retryCount < maxRetries) {
                            retryCount++;
                            console.log(`重试第 ${retryCount} 次...`);
                            return false; // 表示需要重试
                        } else {
                            throw new Error('多次重试加入房间失败');
                        }
                    }

                    this.roomId = room._id;
                    this.playerNumber = 2;  // 作为玩家2加入
                    console.log('成功加入房间:', this.roomId, '玩家编号:', this.playerNumber);
                    
                    // 开始监听房间变化
                    await this.startWatchingRoom();
                    
                    wx.hideLoading();
                    wx.showToast({
                        title: '已加入房间',
                        icon: 'success'
                    });

                    // 通知游戏场景
                    this.gameScene.setPlayerNumber(this.playerNumber);
                    return true;
                } else {
                    console.log('没有找到可用房间，创建新房间...')
                    // 创建新房间
                    const createResult = await this.callCloudFunction('gameRoom', { 
                        action: 'createRoom' 
                    });
                    console.log('创建房间结果:', createResult);

                    if (!createResult?.result) {
                        throw new Error('创建房间失败：无效的返回结果');
                    }

                    const createData = createResult.result;
                    if (!createData.success) {
                        throw new Error(createData.error || '创建房间失败');
                    }

                    if (!createData.roomId) {
                        throw new Error('创建的房间ID无效');
                    }

                    this.roomId = createData.roomId;
                    this.playerNumber = 1;  // 作为玩家1创建
                    console.log('成功创建房间:', this.roomId, '玩家编号:', this.playerNumber);
                    
                    // 开始监听房间变化
                    await this.startWatchingRoom();
                    
                    wx.hideLoading();
                    wx.showToast({
                        title: '等待对手加入...',
                        icon: 'none',
                        duration: 2000
                    });

                    // 通知游戏场景
                    this.gameScene.setPlayerNumber(this.playerNumber);
                    return true;
                }

            } catch (error) {
                console.error('加入游戏失败:', error);
                if (retryCount < maxRetries) {
                    retryCount++;
                    console.log(`遇到错误，重试第 ${retryCount} 次...`);
                    return false; // 表示需要重试
                }
                throw error; // 重试次数用完，抛出错误
            }
        };

        try {
            let success = false;
            while (!success && retryCount < maxRetries) {
                success = await tryJoinGame();
                if (!success) {
                    // 等待一段时间再重试
                    await new Promise(resolve => setTimeout(resolve, retryDelay));
                }
            }

            if (!success) {
                throw new Error('多次尝试后仍未能成功加入游戏');
            }
        } catch (error) {
            wx.hideLoading();
            console.error('加入游戏最终失败:', error);
            wx.showModal({
                title: '加入游戏失败',
                content: `错误信息: ${error.message || '未知错误'}\n请稍后重试`,
                showCancel: false
            });
        }
    }

    // 监听房间变化
    async startWatchingRoom() {
        if (this.watchRef) {
            this.watchRef.close();
        }

        if (!this.isBotMode && this.roomId) {
            try {
                console.log('开始监听房间:', this.roomId);
                
                // 先获取一次当前房间状态
                const roomData = await this.db.collection('game_rooms')
                    .doc(this.roomId)
                    .get();
                console.log('当前房间状态:', roomData.data);

                this.watchRef = this.db.collection('game_rooms')
                    .doc(this.roomId)
                    .watch({
                        onChange: this.handleRoomChange.bind(this),
                        onError: (error) => {
                            console.error('监听房间失败:', error);
                            // 尝试重新连接
                            setTimeout(() => {
                                this.startWatchingRoom();
                            }, 1000);
                        }
                    });

                return Promise.resolve();
            } catch (error) {
                console.error('设置房间监听失败:', error);
                return Promise.reject(error);
            }
        }
    }

    // 处理房间数据变化
    handleRoomChange(snapshot) {
        if (!snapshot || !snapshot.docs || snapshot.docs.length === 0) {
            console.log('房间数据为空');
            return;
        }

        const room = snapshot.docs[0];
        console.log('房间数据更新:', room);

        // 检查房间状态
        if (room.status === 'waiting') {
            if (this.playerNumber === 1) {
                // 玩家1等待玩家2加入
                if (!room.player2) {
                    wx.showToast({
                        title: '等待对手加入...',
                        icon: 'none',
                        duration: 2000
                    });
                } else {
                    // 玩家2已加入，检查准备状态
                    const player1Ready = room.player1?.isReady || false;
                    const player2Ready = room.player2?.isReady || false;
                    
                    if (!player1Ready) {
                        wx.showToast({
                            title: '对手已加入，请点击准备',
                            icon: 'none',
                            duration: 2000
                        });
                    } else if (!player2Ready) {
                        wx.showToast({
                            title: '对手已加入，等待对手准备',
                            icon: 'none',
                            duration: 2000
                        });
                    }
                }
            } else if (this.playerNumber === 2) {
                // 玩家2已加入，检查准备状态
                const player1Ready = room.player1?.isReady || false;
                const player2Ready = room.player2?.isReady || false;
                
                if (!player2Ready) {
                    wx.showToast({
                        title: '已加入房间，请点击准备',
                        icon: 'none',
                        duration: 2000
                    });
                } else if (!player1Ready) {
                    wx.showToast({
                        title: '已准备，等待对手准备',
                        icon: 'none',
                        duration: 2000
                    });
                }
            }
        } else if (room.status === 'playing') {
            // 两个玩家都已准备，开始游戏
            const player1Ready = room.player1?.isReady || false;
            const player2Ready = room.player2?.isReady || false;
            
            if (player1Ready && player2Ready) {
                wx.showToast({
                    title: '游戏开始！',
                    icon: 'success',
                    duration: 1500
                });
                this.gameScene.setPlayerNumber(this.playerNumber);
                this.gameScene.startGame();
            }
        }
    }

    // 发送玩家准备状态
    async sendPlayerReady() {
        try {
            if (!this.roomId) {
                throw new Error('未加入房间');
            }

            // 获取当前房间状态
            const roomQuery = await this.db.collection('game_rooms').doc(this.roomId).get();
            const room = roomQuery.data;
            
            if (!room) {
                throw new Error('房间不存在');
            }

            // 检查是否两个玩家都已加入
            if (!room.player1 || !room.player2) {
                throw new Error('对手还未加入');
            }

            // 获取当前游戏状态
            const currentState = this.gameScene.getGameState();
            const playerKey = `player${this.playerNumber}`;
            
            // 更新玩家准备状态
            await this.callCloudFunction('gameRoom', {
                action: 'updateGameState',
                roomId: this.roomId,
                gameState: {
                    ...currentState,
                    [playerKey]: {
                        ...currentState[playerKey],
                        isReady: true
                    }
                }
            });

            wx.showToast({
                title: '已准备',
                icon: 'success',
                duration: 1500
            });
        } catch (error) {
            console.error('发送准备状态失败:', error);
            wx.showToast({
                title: error.message || '准备失败',
                icon: 'none'
            });
        }
    }

    // 发送玩家动作
    async sendPlayerAction(action) {
        try {
            if (this.isBotMode) {
                // 在机器人模式下，直接更新游戏状态并获取机器人响应
                const gameState = this.gameScene.getGameState();
                gameState.playerAction = action;
                
                // 获取机器人的响应动作
                const botAction = await this.getBotAction(gameState);
                
                // 更新游戏状态
                this.gameScene.updateGameState({
                    ...gameState,
                    botAction: botAction
                });
            } else {
                // 在线对战模式
                const currentState = this.gameScene.getGameState();
                const playerKey = `player${this.playerNumber}`;
                
                await this.callCloudFunction('gameRoom', {
                    action: 'updateGameState',
                    roomId: this.roomId,
                    gameState: {
                        player1: currentState.player1,
                        player2: currentState.player2,
                        [playerKey]: {
                            ...currentState[playerKey],
                            lastAction: action
                        }
                    }
                });
            }
        } catch (error) {
            console.error('发送动作失败:', error);
            wx.showToast({
                title: '发送动作失败',
                icon: 'none'
            });
        }
    }

    // 断开连接
    disconnect() {
        if (this.watchRef) {
            this.watchRef.close();
        }
        this.isConnected = false;
        this.playerNumber = 0;
        this.roomId = '';
        this.isBotMode = false;
        this.botData = null;
    }

    // 创建房间
    async createRoom() {
        try {
            console.log('创建新房间...')
            
            // 显示加载提示
            wx.showLoading({
                title: '正在创建房间...',
                mask: true
            });

            // 创建房间
            const createResult = await this.callCloudFunction('gameRoom', { 
                action: 'createRoom' 
            });
            console.log('创建房间结果:', createResult);

            if (!createResult?.result) {
                throw new Error('创建房间失败：无效的返回结果');
            }

            const createData = createResult.result;
            if (!createData.success) {
                throw new Error(createData.error || '创建房间失败');
            }

            if (!createData.roomId || !createData.roomNumber) {
                throw new Error('创建的房间数据无效');
            }

            this.roomId = createData.roomId;
            this.playerNumber = 1;  // 作为玩家1创建
            console.log('成功创建房间:', this.roomId, '房间号:', createData.roomNumber, '玩家编号:', this.playerNumber);
            
            // 开始监听房间变化
            await this.startWatchingRoom();
            
            wx.hideLoading();
            wx.showModal({
                title: '房间创建成功',
                content: `房间号：${createData.roomNumber}\n请将房间号告诉你的对手`,
                showCancel: false
            });

            // 通知游戏场景
            this.gameScene.setPlayerNumber(this.playerNumber);
            return true;
        } catch (error) {
            wx.hideLoading();
            console.error('创建房间失败:', error);
            wx.showModal({
                title: '创建房间失败',
                content: `错误信息: ${error.message || '未知错误'}\n请稍后重试`,
                showCancel: false
            });
            return false;
        }
    }

    // 加入指定房间
    async joinRoomByNumber(roomNumber) {
        try {
            if (!roomNumber) {
                throw new Error('请输入房间号');
            }

            console.log('加入房间:', roomNumber)
            
            // 显示加载提示
            wx.showLoading({
                title: '正在加入房间...',
                mask: true
            });

            // 查找房间
            const findResult = await this.callCloudFunction('gameRoom', { 
                action: 'findRoom',
                roomNumber: roomNumber
            });
            console.log('查找房间结果:', findResult);

            if (!findResult?.result) {
                throw new Error('查找房间失败：无效的返回结果');
            }

            const { result } = findResult;
            if (!result.success) {
                throw new Error(result.error || '查找房间失败');
            }

            if (!result.rooms || result.rooms.length === 0) {
                throw new Error('房间不存在或已满');
            }

            const room = result.rooms[0];
            console.log('准备加入的房间:', room);
            
            if (!room?._id) {
                throw new Error('房间数据无效');
            }
            
            // 加入房间
            const joinResult = await this.callCloudFunction('gameRoom', {
                action: 'joinRoom',
                roomId: room._id
            });
            console.log('加入房间结果:', joinResult);

            if (!joinResult?.result) {
                throw new Error('加入房间失败：无效的返回结果');
            }

            const joinData = joinResult.result;
            if (!joinData.success) {
                throw new Error(joinData.error || '加入房间失败');
            }

            this.roomId = room._id;
            this.playerNumber = 2;  // 作为玩家2加入
            console.log('成功加入房间:', this.roomId, '玩家编号:', this.playerNumber);
            
            // 开始监听房间变化
            await this.startWatchingRoom();
            
            wx.hideLoading();
            wx.showToast({
                title: '已加入房间',
                icon: 'success'
            });

            // 通知游戏场景
            this.gameScene.setPlayerNumber(this.playerNumber);
            return true;
        } catch (error) {
            wx.hideLoading();
            console.error('加入房间失败:', error);
            wx.showModal({
                title: '加入房间失败',
                content: `错误信息: ${error.message || '未知错误'}\n请检查房间号是否正确`,
                showCancel: false
            });
            return false;
        }
    }

    // 获取可用房间列表
    async getAvailableRooms() {
        try {
            console.log('获取可用房间列表...')
            
            // 显示加载提示
            wx.showLoading({
                title: '正在获取房间列表...',
                mask: true
            });

            // 查找所有可用房间
            const findResult = await this.callCloudFunction('gameRoom', { 
                action: 'findRoom'
            });
            console.log('查找房间结果:', findResult);

            if (!findResult?.result) {
                throw new Error('获取房间列表失败：无效的返回结果');
            }

            const { result } = findResult;
            if (!result.success) {
                throw new Error(result.error || '获取房间列表失败');
            }

            wx.hideLoading();
            return result.rooms || [];
        } catch (error) {
            wx.hideLoading();
            console.error('获取房间列表失败:', error);
            wx.showToast({
                title: '获取房间列表失败',
                icon: 'none'
            });
            return [];
        }
    }
} 