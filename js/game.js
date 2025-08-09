import NetworkManager from './runtime/networkManager'

export default class Game {
    constructor() {
        console.log('Game constructor')
        this.canvas = null
        this.ctx = null
        this.networkManager = null
        this.playerPosition = { x: 50, y: 50 }
        this.botPosition = { x: 250, y: 250 }
        this.playerNumber = null
        this.botData = null
        this.obstacles = []
        this.gameStarted = false
        this.gameLoop = null
        this.moveSpeed = 5
        this.roomId = null
        this.isGameStarted = false
        this.isPlayerReady = false
        this.opponentReady = false
        
        // 初始化云开发
        if (!wx.cloud) {
            console.error('请使用 2.2.3 或以上的基础库以使用云能力')
            return
        }
        
        wx.cloud.init({
            env: wx.cloud.DYNAMIC_CURRENT_ENV,
            traceUser: true
        })
        console.log('云开发初始化配置完成')

        // 初始化网络管理器
        this.networkManager = new NetworkManager(this)

        // 初始化UI
        this.initUI()
    }

    initUI() {
        // 创建房间按钮
        this.createRoomBtn = new Button({
            text: '创建房间',
            x: this.canvas.width / 2,
            y: this.canvas.height / 2 - 50,
            width: 200,
            height: 50,
            onClick: () => this.handleCreateRoom()
        });

        // 加入房间按钮
        this.joinRoomBtn = new Button({
            text: '加入房间',
            x: this.canvas.width / 2,
            y: this.canvas.height / 2 + 50,
            width: 200,
            height: 50,
            onClick: () => this.handleJoinRoom()
        });

        // 房间号输入框
        this.roomNumberInput = new Input({
            x: this.canvas.width / 2,
            y: this.canvas.height / 2 + 10,
            width: 200,
            height: 40,
            placeholder: '请输入房间号'
        });

        // 开始游戏按钮
        this.startGameBtn = new Button({
            text: '开始游戏',
            x: this.canvas.width / 2,
            y: this.canvas.height / 2 + 100,
            width: 200,
            height: 50,
            visible: false,
            onClick: () => this.handleStartGame()
        });

        // 添加UI元素到场景
        this.addChild(this.createRoomBtn);
        this.addChild(this.joinRoomBtn);
        this.addChild(this.roomNumberInput);
        this.addChild(this.startGameBtn);
    }

    async handleCreateRoom() {
        const success = await this.networkManager.createRoom();
        if (success) {
            this.createRoomBtn.visible = false;
            this.joinRoomBtn.visible = false;
            this.roomNumberInput.visible = false;
            this.startGameBtn.visible = true;
        }
    }

    async handleJoinRoom() {
        const roomNumber = this.roomNumberInput.value;
        if (!roomNumber) {
            wx.showToast({
                title: '请输入房间号',
                icon: 'none'
            });
            return;
        }

        const success = await this.networkManager.joinRoomByNumber(roomNumber);
        if (success) {
            this.createRoomBtn.visible = false;
            this.joinRoomBtn.visible = false;
            this.roomNumberInput.visible = false;
            this.startGameBtn.visible = true;
        }
    }

    async handleStartGame() {
        if (!this.isPlayerReady) {
            this.isPlayerReady = true;
            await this.networkManager.sendPlayerReady();
            this.startGameBtn.text = '等待对手准备...';
            this.startGameBtn.enabled = false;
        }
    }

    setPlayerNumber(number) {
        this.playerNumber = number;
        console.log('设置玩家编号:', number);
    }

    async init() {
        console.log('Game init start')
        try {
            // 连接网络
            await this.networkManager.connect()
            console.log('网络连接成功')

            // 创建画布
            this.canvas = wx.createCanvas()
            this.ctx = this.canvas.getContext('2d')
            
            // 设置画布尺寸
            const { windowWidth, windowHeight } = wx.getSystemInfoSync()
            this.canvas.width = windowWidth
            this.canvas.height = windowHeight
            console.log('Canvas size:', windowWidth, windowHeight)

            // 立即开始渲染测试内容
            this.renderTestContent()

            // 启动游戏循环
            this.startGameLoop()

            // 开始游戏（机器人模式）
            this.networkManager.isBotMode = true
            this.networkManager.botLevel = 'medium'
            await this.networkManager.joinGame()

            console.log('Game init complete')
        } catch (error) {
            console.error('Game init error:', error)
            wx.showToast({
                title: '初始化失败',
                icon: 'none'
            })
        }
    }

    renderTestContent() {
        console.log('Rendering test content')
        // 清空画布
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

        // 设置背景色
        this.ctx.fillStyle = '#ffffff'
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)

        // 绘制一些测试图形
        // 红色方块
        this.ctx.fillStyle = '#ff0000'
        this.ctx.fillRect(50, 50, 100, 100)

        // 蓝色圆形
        this.ctx.fillStyle = '#0000ff'
        this.ctx.beginPath()
        this.ctx.arc(200, 200, 50, 0, Math.PI * 2)
        this.ctx.fill()

        // 绿色三角形
        this.ctx.fillStyle = '#00ff00'
        this.ctx.beginPath()
        this.ctx.moveTo(300, 100)
        this.ctx.lineTo(350, 200)
        this.ctx.lineTo(250, 200)
        this.ctx.closePath()
        this.ctx.fill()

        // 添加文本
        this.ctx.fillStyle = '#000000'
        this.ctx.font = '20px Arial'
        this.ctx.fillText('测试渲染', 50, 300)

        console.log('Test content rendered')
    }

    startGameLoop() {
        console.log('Starting game loop')
        // 清除之前的游戏循环
        if (this.gameLoop) {
            cancelAnimationFrame(this.gameLoop)
        }

        const loop = () => {
            this.update()
            this.render()
            this.gameLoop = requestAnimationFrame(loop)
        }
        loop()
    }

    update() {
        // 游戏逻辑更新
        if (!this.gameStarted) return
    }

    render() {
        if (!this.ctx) {
            console.error('No context available')
            return
        }

        try {
            // 清空画布
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

            // 设置背景色
            this.ctx.fillStyle = '#ffffff'
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)

            // 绘制玩家
            this.ctx.fillStyle = '#ff0000'
            this.ctx.beginPath()
            this.ctx.arc(this.playerPosition.x, this.playerPosition.y, 15, 0, Math.PI * 2)
            this.ctx.fill()

            // 绘制机器人
            this.ctx.fillStyle = '#0000ff'
            this.ctx.beginPath()
            this.ctx.arc(this.botPosition.x, this.botPosition.y, 15, 0, Math.PI * 2)
            this.ctx.fill()

            // 绘制障碍物
            this.ctx.fillStyle = '#666666'
            this.obstacles.forEach(obs => {
                this.ctx.fillRect(obs.x, obs.y, obs.width, obs.height)
            })

            // 绘制状态信息
            this.ctx.fillStyle = '#000000'
            this.ctx.font = '20px Arial'
            this.ctx.fillText(`玩家${this.playerNumber}`, 10, 30)

            // 渲染UI元素
            this.createRoomBtn.render();
            this.joinRoomBtn.render();
            this.roomNumberInput.render();
            this.startGameBtn.render();
        } catch (error) {
            console.error('Render error:', error)
        }
    }
} 