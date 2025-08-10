// 在线对战管理器
export default class OnlineManager {
    constructor() {
        this.roomId = null;
        this.playerId = null;
        this.isHost = false;
        this.isConnected = false;
        this.opponent = null;
        
        // 使用云函数或WebSocket进行通信
        this.ws = null;
        
        // 回调函数
        this.onOpponentJoined = null;
        this.onOpponentLeft = null;
        this.onOpponentAction = null;
        this.onConnectionLost = null;
    }
    
    // 创建房间
    async createRoom() {
        try {
            // 生成房间ID（6位数字）
            this.roomId = Math.floor(100000 + Math.random() * 900000).toString();
            this.playerId = this.generatePlayerId();
            this.isHost = true;
            
            // 调用云函数创建房间
            const res = await wx.cloud.callFunction({
                name: 'gameRoom',
                data: {
                    action: 'create',
                    roomId: this.roomId,
                    playerId: this.playerId
                }
            });
            
            if (res.result.success) {
                console.log('房间创建成功:', this.roomId);
                this.startListening();
                return this.roomId;
            } else {
                throw new Error('创建房间失败');
            }
        } catch (error) {
            console.error('创建房间错误:', error);
            // 如果云函数不可用，使用本地模式
            this.roomId = Math.floor(100000 + Math.random() * 900000).toString();
            this.playerId = this.generatePlayerId();
            this.isHost = true;
            return this.roomId;
        }
    }
    
    // 加入房间
    async joinRoom(roomId) {
        try {
            this.roomId = roomId;
            this.playerId = this.generatePlayerId();
            this.isHost = false;
            
            // 调用云函数加入房间
            const res = await wx.cloud.callFunction({
                name: 'gameRoom',
                data: {
                    action: 'join',
                    roomId: this.roomId,
                    playerId: this.playerId
                }
            });
            
            if (res.result.success) {
                console.log('加入房间成功:', this.roomId);
                this.startListening();
                this.isConnected = true;
                
                // 通知房主有人加入
                this.sendMessage({
                    type: 'playerJoined',
                    playerId: this.playerId
                });
                
                return true;
            } else {
                throw new Error('房间不存在或已满');
            }
        } catch (error) {
            console.error('加入房间错误:', error);
            wx.showToast({
                title: '加入房间失败',
                icon: 'none'
            });
            return false;
        }
    }
    
    // 发送动作
    sendAction(action) {
        if (!this.isConnected && !this.isHost) return;
        
        this.sendMessage({
            type: 'action',
            action: action,
            playerId: this.playerId
        });
    }
    
    // 发送准备状态
    sendReady() {
        this.sendMessage({
            type: 'ready',
            playerId: this.playerId
        });
    }
    
    // 发送消息
    async sendMessage(message) {
        try {
            await wx.cloud.callFunction({
                name: 'gameRoom',
                data: {
                    action: 'send',
                    roomId: this.roomId,
                    message: message
                }
            });
        } catch (error) {
            console.error('发送消息失败:', error);
        }
    }
    
    // 开始监听
    startListening() {
        // 使用定时器轮询云函数获取消息
        this.pollInterval = setInterval(() => {
            this.pollMessages();
        }, 1000);
    }
    
    // 轮询消息
    async pollMessages() {
        try {
            const res = await wx.cloud.callFunction({
                name: 'gameRoom',
                data: {
                    action: 'poll',
                    roomId: this.roomId,
                    playerId: this.playerId
                }
            });
            
            if (res.result.messages && res.result.messages.length > 0) {
                res.result.messages.forEach(msg => {
                    this.handleMessage(msg);
                });
            }
        } catch (error) {
            console.error('轮询消息失败:', error);
        }
    }
    
    // 处理消息
    handleMessage(message) {
        switch (message.type) {
            case 'playerJoined':
                if (this.onOpponentJoined) {
                    this.opponent = message.playerId;
                    this.isConnected = true;
                    this.onOpponentJoined();
                }
                break;
                
            case 'playerLeft':
                if (this.onOpponentLeft) {
                    this.opponent = null;
                    this.isConnected = false;
                    this.onOpponentLeft();
                }
                break;
                
            case 'action':
                if (this.onOpponentAction && message.playerId !== this.playerId) {
                    this.onOpponentAction(message.action);
                }
                break;
                
            case 'ready':
                // 处理准备状态
                break;
        }
    }
    
    // 生成玩家ID
    generatePlayerId() {
        return 'player_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    // 断开连接
    disconnect() {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }
        
        if (this.roomId) {
            this.sendMessage({
                type: 'playerLeft',
                playerId: this.playerId
            });
        }
        
        this.isConnected = false;
        this.roomId = null;
        this.opponent = null;
    }
    
    // 分享房间
    shareRoom() {
        if (!this.roomId) return;
        
        wx.shareAppMessage({
            title: '来一场生死对决吧！',
            path: '/game.js?roomId=' + this.roomId,
            imageUrl: '/images/share.png'
        });
    }
    
    // 从分享参数获取房间ID
    static getRoomIdFromQuery() {
        const launchOptions = wx.getLaunchOptionsSync();
        if (launchOptions.query && launchOptions.query.roomId) {
            return launchOptions.query.roomId;
        }
        return null;
    }
}