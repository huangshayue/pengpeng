import EnhancedGameScene from './enhancedGameScene.js';

// 游戏主类
export default class Main {
    constructor() {
        console.log('Main类构造函数开始');
        this.init();
    }

    init() {
        console.log('开始初始化游戏');
        try {
            // 初始化游戏
            this.initCanvas();
            this.initGameScene();
            this.initTouchEvents();
            
            // 立即开始第一次渲染
            this.render();
            
            // 启动游戏循环
            this.gameLoop();
            
            console.log('游戏初始化完成');
        } catch (error) {
            console.error('初始化过程中发生错误:', error);
            wx.showToast({
                title: '初始化失败：' + error.message,
                icon: 'none',
                duration: 3000
            });
        }
    }

    // 初始化画布
    initCanvas() {
        console.log('开始初始化画布');
        try {
            const canvas = wx.createCanvas();
            console.log('Canvas创建成功');
            
            this.ctx = canvas.getContext('2d');
            if (!this.ctx) {
                throw new Error('获取2d上下文失败');
            }
            console.log('2d上下文获取成功');
            
            this.canvasWidth = canvas.width;
            this.canvasHeight = canvas.height;
            console.log('画布尺寸:', this.canvasWidth, this.canvasHeight);
            
            console.log('画布初始化完成');
        } catch (error) {
            console.error('画布初始化失败:', error);
            throw error;
        }
    }

    // 初始化游戏场景
    initGameScene() {
        console.log('开始初始化游戏场景');
        try {
            this.gameScene = new EnhancedGameScene(
                this.ctx,
                this.canvasWidth,
                this.canvasHeight
            );
            console.log('游戏场景初始化完成');
        } catch (error) {
            console.error('游戏场景初始化失败:', error);
            throw error;
        }
    }

    // 初始化触摸事件
    initTouchEvents() {
        console.log('开始初始化触摸事件');
        try {
            wx.onTouchStart((e) => {
                const touch = e.touches[0];
                this.gameScene.handleTouch(touch.clientX, touch.clientY);
            });

            console.log('触摸事件初始化完成');
        } catch (error) {
            console.error('触摸事件初始化失败:', error);
            throw error;
        }
    }

    // 绘制游戏界面
    render() {
        try {
            // 清空画布
            this.ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
            
            // 渲染游戏场景
            this.gameScene.render();
        } catch (error) {
            console.error('渲染过程中发生错误:', error);
            throw error;
        }
    }

    // 游戏主循环
    gameLoop() {
        console.log('游戏循环开始');
        const loop = () => {
            try {
                // 渲染画面
                this.render();
                
                requestAnimationFrame(loop);
            } catch (error) {
                console.error('游戏循环发生错误:', error);
                wx.showToast({
                    title: '游戏运行错误：' + error.message,
                    icon: 'none',
                    duration: 3000
                });
            }
        };
        requestAnimationFrame(loop);
    }
} 