import GameState, { ActionType } from './gameState.js';
import NetworkManager from './networkManager.js';

export default class GameScene {
    constructor(ctx, width, height) {
        this.ctx = ctx;
        this.width = width;
        this.height = height;
        
        // 创建游戏状态管理器
        this.gameState = new GameState();
        
        // 创建网络管理器
        this.networkManager = new NetworkManager(this);
        
        // 定义按钮布局
        this.buttons = this.createButtons();
        
        // 游戏状态
        this.isGameStarted = false;
        this.playerNumber = 0;
        
        // 初始化游戏
        this.init();
    }

    // 初始化游戏
    async init() {
        try {
            // 连接到服务器
            await this.networkManager.connect();
            
            // 显示开始游戏按钮
            this.showStartButton();
        } catch (error) {
            console.error('初始化游戏失败:', error);
            wx.showToast({
                title: '连接服务器失败',
                icon: 'none'
            });
        }
    }

    // 显示开始游戏按钮
    showStartButton() {
        const buttonWidth = 200;
        const buttonHeight = 60;
        const x = (this.width - buttonWidth) / 2;
        const y = (this.height - buttonHeight) / 2;

        this.startButton = {
            x,
            y,
            width: buttonWidth,
            height: buttonHeight,
            text: '开始匹配'
        };
    }

    // 设置玩家编号
    setPlayerNumber(number) {
        this.playerNumber = number;
        wx.hideLoading();
        
        wx.showToast({
            title: `你是玩家${number}`,
            icon: 'none'
        });
    }

    // 开始游戏
    startGame() {
        this.isGameStarted = true;
        this.startButton = null; // 移除开始按钮
    }

    // 结束游戏
    endGame(winner) {
        this.isGameStarted = false;
        this.showStartButton();
        
        wx.showModal({
            title: '游戏结束',
            content: winner === this.playerNumber ? '你赢了！' : '你输了！',
            showCancel: false
        });
    }

    // 处理对手的动作
    handleOpponentAction(action) {
        this.gameState.handleAction(this.playerNumber === 1 ? 2 : 1, action);
    }

    // 更新游戏状态
    updateGameState(newState) {
        this.gameState = newState;
    }

    // 创建游戏按钮
    createButtons() {
        const buttonWidth = this.width / 3;
        const buttonHeight = 50;
        const buttonY = this.height - 120;
        const spacing = 10;

        return {
            // 第一行按钮（积气和防御）
            accumulate: {
                x: 0,
                y: buttonY,
                width: buttonWidth,
                height: buttonHeight,
                text: '积气',
                action: ActionType.ACCUMULATE
            },
            normalDefense: {
                x: buttonWidth,
                y: buttonY,
                width: buttonWidth,
                height: buttonHeight,
                text: '普挡',
                action: ActionType.NORMAL_DEFENSE
            },
            bloodDefense: {
                x: buttonWidth * 2,
                y: buttonY,
                width: buttonWidth,
                height: buttonHeight,
                text: '血挡',
                action: ActionType.BLOOD_DEFENSE
            },
            // 第二行按钮（攻击）
            fingerAttack: {
                x: 0,
                y: buttonY + buttonHeight + spacing,
                width: buttonWidth,
                height: buttonHeight,
                text: '一指',
                action: ActionType.FINGER_ATTACK
            },
            waveAttack: {
                x: buttonWidth,
                y: buttonY + buttonHeight + spacing,
                width: buttonWidth,
                height: buttonHeight,
                text: '发波',
                action: ActionType.WAVE_ATTACK
            },
            grindAttack: {
                x: buttonWidth * 2,
                y: buttonY + buttonHeight + spacing,
                width: buttonWidth,
                height: buttonHeight,
                text: '磨磨',
                action: ActionType.GRIND_ATTACK
            }
        };
    }

    // 检查点击位置是否在按钮上
    checkButtonClick(x, y) {
        // 如果游戏未开始，只检查开始按钮
        if (!this.isGameStarted && this.startButton) {
            if (x >= this.startButton.x && x < this.startButton.x + this.startButton.width &&
                y >= this.startButton.y && y < this.startButton.y + this.startButton.height) {
                return 'start';
            }
            return null;
        }

        // 游戏已开始，检查操作按钮
        for (const [key, button] of Object.entries(this.buttons)) {
            if (x >= button.x && x < button.x + button.width &&
                y >= button.y && y < button.y + button.height) {
                return button.action;
            }
        }
        return null;
    }

    // 处理触摸事件
    handleTouch(x, y) {
        const action = this.checkButtonClick(x, y);
        if (!action) return;

        if (action === 'start') {
            this.networkManager.joinGame();
            return;
        }

        if (!this.isGameStarted) {
            wx.showToast({
                title: '游戏未开始',
                icon: 'none'
            });
            return;
        }

        // 执行动作并发送到服务器
        const success = this.gameState.handleAction(this.playerNumber, action);
        if (success) {
            this.networkManager.sendPlayerAction(action);
        }
    }

    // 渲染游戏场景
    render() {
        this.renderBackground();
        
        if (!this.isGameStarted && this.startButton) {
            this.renderStartButton();
        } else {
            this.renderUI();
            this.renderButtons();
        }
    }

    // 渲染背景
    renderBackground() {
        this.ctx.fillStyle = '#F0F0F0';
        this.ctx.fillRect(0, 0, this.width, this.height);
    }

    // 渲染开始按钮
    renderStartButton() {
        const button = this.startButton;
        
        // 绘制按钮背景
        this.ctx.fillStyle = '#4CAF50';
        this.ctx.fillRect(button.x, button.y, button.width, button.height);
        
        // 绘制按钮边框
        this.ctx.strokeStyle = '#388E3C';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(button.x, button.y, button.width, button.height);
        
        // 绘制按钮文字
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = '24px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(
            button.text,
            button.x + button.width / 2,
            button.y + button.height / 2
        );
    }

    // 渲染UI（玩家状态）
    renderUI() {
        // 根据玩家编号决定显示位置
        if (this.playerNumber === 1) {
            this.renderPlayerStatus(1, this.gameState.player1, 50);
            this.renderPlayerStatus(2, this.gameState.player2, this.height - 150);
        } else {
            this.renderPlayerStatus(2, this.gameState.player2, 50);
            this.renderPlayerStatus(1, this.gameState.player1, this.height - 150);
        }
    }

    // 渲染玩家状态
    renderPlayerStatus(playerNumber, player, y) {
        this.ctx.fillStyle = '#333';
        this.ctx.font = '20px Arial';
        this.ctx.textAlign = 'left';
        
        const isCurrentPlayer = playerNumber === this.playerNumber;
        const playerText = isCurrentPlayer ? '你' : '对手';
        
        // 玩家标题
        this.ctx.fillText(`${playerText}`, 20, y);
        
        // 生命值
        this.ctx.fillStyle = '#FF0000';
        this.ctx.fillText(`生命: ${player.health}`, 20, y + 30);
        
        // 气值
        this.ctx.fillStyle = '#0000FF';
        this.ctx.fillText(`气: ${player.qi}`, 20, y + 60);
        
        // 防御状态
        this.ctx.fillStyle = '#008000';
        this.ctx.fillText(
            `防御: ${player.isDefending ? player.defenseType : '无'}`,
            20, y + 90
        );
    }

    // 渲染按钮
    renderButtons() {
        for (const button of Object.values(this.buttons)) {
            // 绘制按钮背景
            this.ctx.fillStyle = '#2196F3';
            this.ctx.fillRect(
                button.x,
                button.y,
                button.width,
                button.height
            );
            
            // 绘制按钮边框
            this.ctx.strokeStyle = '#1976D2';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(
                button.x,
                button.y,
                button.width,
                button.height
            );
            
            // 绘制按钮文字
            this.ctx.fillStyle = '#FFFFFF';
            this.ctx.font = '20px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(
                button.text,
                button.x + button.width / 2,
                button.y + button.height / 2
            );
        }
    }
} 