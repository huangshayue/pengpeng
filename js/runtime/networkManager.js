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
        this.gameScene = gameScene;
        this.isConnected = false;
        this.playerNumber = 0; // 0: 未分配, 1: 玩家1, 2: 玩家2
        this.roomId = '';
        this.isBotMode = false;
        this.botLevel = 'medium';
        this.botData = null;
        
        // 初始化云开发
        wx.cloud.init({
            env: cloud.DYNAMIC_CURRENT_ENV,
            traceUser: true
        });
        
        this.db = wx.cloud.database();
        this._ = this.db.command;
        this.rooms = this.db.collection('game_rooms');
        this.watchRef = null;
    }

    // 连接到服务器（在云开发中，这变成了初始化过程）
    async connect() {
        try {
            this.isConnected = true;
            console.log('云开发初始化成功');
            return Promise.resolve();
        } catch (error) {
            console.error('云开发初始化失败:', error);
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
        if (this.isBotMode) {
            return this.startBotMode(this.botLevel);
        }

        try {
            // 查找可用房间
            const { result } = await wx.cloud.callFunction({
                name: 'gameRoom',
                data: { action: 'findRoom' }
            });

            if (result.success && result.rooms.length > 0) {
                // 加入现有房间
                const joinResult = await wx.cloud.callFunction({
                    name: 'gameRoom',
                    data: {
                        action: 'joinRoom',
                        roomId: result.rooms[0]._id
                    }
                });

                if (joinResult.result.success) {
                    this.roomId = result.rooms[0]._id;
                    this.playerNumber = 2;
                }
            } else {
                // 创建新房间
                const createResult = await wx.cloud.callFunction({
                    name: 'gameRoom',
                    data: { action: 'createRoom' }
                });

                if (createResult.result.success) {
                    this.roomId = createResult.result.roomId;
                    this.playerNumber = 1;
                }
            }

            // 开始监听房间变化
            if (!this.isBotMode) {
                this.startWatchingRoom();
            }
            
            // 通知游戏场景
            this.gameScene.setPlayerNumber(this.playerNumber);

            if (this.playerNumber === 2) {
                // 如果是玩家2加入，通知游戏开始
                this.gameScene.startGame();
            }

        } catch (error) {
            console.error('加入游戏失败:', error);
            wx.showToast({
                title: '加入游戏失败',
                icon: 'none'
            });
        }
    }

    // 监听房间变化
    startWatchingRoom() {
        if (this.watchRef) {
            this.watchRef.close();
        }

        if (!this.isBotMode) {
            this.watchRef = this.rooms.doc(this.roomId)
                .watch({
                    onChange: this.handleRoomChange.bind(this),
                    onError: (error) => {
                        console.error('监听房间失败:', error);
                    }
                });
        }
    }

    // 处理房间数据变化
    handleRoomChange(snapshot) {
        const room = snapshot.docs[0];
        if (!room) return;

        // 更新游戏状态
        if (room.gameState) {
            this.gameScene.updateGameState(room.gameState);
        }

        // 处理游戏结束
        if (room.status === 'finished') {
            this.gameScene.endGame(room.winner);
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
                await wx.cloud.callFunction({
                    name: 'gameRoom',
                    data: {
                        action: 'updateGameState',
                        roomId: this.roomId,
                        gameState: {
                            ...this.gameScene.getGameState(),
                            [`player${this.playerNumber}Action`]: action
                        }
                    }
                });
            }
        } catch (error) {
            console.error('发送动作失败:', error);
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
} 