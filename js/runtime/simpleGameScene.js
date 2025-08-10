import GameState, { ActionType } from './gameState.js';

export default class SimpleGameScene {
    constructor(ctx, width, height) {
        this.ctx = ctx;
        this.width = width;
        this.height = height;
        
        // 创建游戏状态管理器
        this.gameState = new GameState();
        
        // 定义按钮布局
        this.buttons = this.createButtons();
        
        // 游戏状态
        this.isGameStarted = false;
        this.currentPlayer = 1; // 当前回合玩家
        this.isAIMode = true; // 默认AI模式
        
        // 初始化游戏
        this.init();
    }

    // 初始化游戏
    init() {
        console.log('初始化简单游戏场景');
        this.showStartButton();
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
            text: '开始游戏'
        };
    }

    // 开始游戏
    startGame() {
        this.isGameStarted = true;
        this.startButton = null;
        this.gameState.reset();
        this.currentPlayer = 1;
        
        wx.showToast({
            title: '游戏开始！',
            icon: 'success',
            duration: 1500
        });
    }

    // AI执行动作
    aiTurn() {
        if (!this.isGameStarted || this.currentPlayer !== 2) return;
        
        setTimeout(() => {
            const aiActions = [
                ActionType.ACCUMULATE,
                ActionType.NORMAL_DEFENSE,
                ActionType.BLOOD_DEFENSE
            ];
            
            // AI根据气值选择攻击
            if (this.gameState.player2.qi >= 5) {
                aiActions.push(ActionType.WAVE_ATTACK);
            } else if (this.gameState.player2.qi >= 2) {
                aiActions.push(ActionType.GRIND_ATTACK);
            } else if (this.gameState.player2.qi >= 1) {
                aiActions.push(ActionType.FINGER_ATTACK);
            }
            
            // 随机选择一个动作
            const randomAction = aiActions[Math.floor(Math.random() * aiActions.length)];
            const success = this.gameState.handleAction(2, randomAction);
            
            if (success) {
                console.log('AI执行动作:', randomAction);
                
                // 清除防御状态
                if (randomAction !== ActionType.NORMAL_DEFENSE && randomAction !== ActionType.BLOOD_DEFENSE) {
                    this.gameState.player2.isDefending = false;
                    this.gameState.player2.defenseType = null;
                }
                
                // 检查游戏是否结束
                const winner = this.gameState.checkGameOver();
                if (winner > 0) {
                    this.endGame(winner);
                } else {
                    // 切换回玩家回合
                    this.currentPlayer = 1;
                }
            }
        }, 1000);
    }

    // 结束游戏
    endGame(winner) {
        this.isGameStarted = false;
        this.showStartButton();
        
        wx.showModal({
            title: '游戏结束',
            content: winner === 1 ? '你赢了！' : '你输了！',
            showCancel: false
        });
    }

    // 创建游戏按钮
    createButtons() {
        const buttonWidth = this.width / 3;
        const buttonHeight = 50;
        const buttonY = this.height - 180;
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
                text: '一指(1气)',
                action: ActionType.FINGER_ATTACK
            },
            waveAttack: {
                x: buttonWidth,
                y: buttonY + buttonHeight + spacing,
                width: buttonWidth,
                height: buttonHeight,
                text: '发波(5气)',
                action: ActionType.WAVE_ATTACK
            },
            grindAttack: {
                x: buttonWidth * 2,
                y: buttonY + buttonHeight + spacing,
                width: buttonWidth,
                height: buttonHeight,
                text: '磨磨(2气)',
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
            this.startGame();
            return;
        }

        if (!this.isGameStarted) {
            wx.showToast({
                title: '游戏未开始',
                icon: 'none'
            });
            return;
        }

        if (this.currentPlayer !== 1) {
            wx.showToast({
                title: 'AI回合中...',
                icon: 'none'
            });
            return;
        }

        // 执行玩家动作
        const success = this.gameState.handleAction(1, action);
        if (success) {
            // 清除防御状态（如果不是防御动作）
            if (action !== ActionType.NORMAL_DEFENSE && action !== ActionType.BLOOD_DEFENSE) {
                this.gameState.player1.isDefending = false;
                this.gameState.player1.defenseType = null;
            }
            
            // 检查游戏是否结束
            const winner = this.gameState.checkGameOver();
            if (winner > 0) {
                this.endGame(winner);
            } else {
                // 切换到AI回合
                this.currentPlayer = 2;
                this.aiTurn();
            }
        } else {
            wx.showToast({
                title: '气不足',
                icon: 'none'
            });
        }
    }

    // 渲染游戏场景
    render() {
        this.renderBackground();
        
        if (!this.isGameStarted && this.startButton) {
            this.renderStartButton();
        } else if (this.isGameStarted) {
            this.renderUI();
            this.renderButtons();
            this.renderTurnIndicator();
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

    // 渲染回合指示器
    renderTurnIndicator() {
        this.ctx.fillStyle = this.currentPlayer === 1 ? '#4CAF50' : '#FF5722';
        this.ctx.font = '18px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(
            this.currentPlayer === 1 ? '你的回合' : 'AI思考中...',
            this.width / 2,
            this.height / 2
        );
    }

    // 渲染UI（玩家状态）
    renderUI() {
        // AI状态（上方）
        this.renderPlayerStatus('AI', this.gameState.player2, 50);
        // 玩家状态（下方）
        this.renderPlayerStatus('你', this.gameState.player1, this.height - 250);
    }

    // 渲染玩家状态
    renderPlayerStatus(playerName, player, y) {
        if (!player) return;

        this.ctx.fillStyle = '#333';
        this.ctx.font = '20px Arial';
        this.ctx.textAlign = 'left';
        
        // 玩家标题
        this.ctx.fillText(`${playerName}`, 20, y);
        
        // 生命值
        this.ctx.fillStyle = '#FF0000';
        this.ctx.fillText(`生命: ${player.health}`, 20, y + 30);
        
        // 生命值条
        const barWidth = 150;
        const barHeight = 10;
        this.ctx.fillStyle = '#FFB0B0';
        this.ctx.fillRect(100, y + 22, barWidth, barHeight);
        this.ctx.fillStyle = '#FF0000';
        this.ctx.fillRect(100, y + 22, barWidth * (player.health / 100), barHeight);
        
        // 气值
        this.ctx.fillStyle = '#0000FF';
        this.ctx.fillText(`气: ${player.qi}`, 20, y + 60);
        
        // 气值指示器
        for (let i = 0; i < Math.min(player.qi, 10); i++) {
            this.ctx.fillStyle = '#4169E1';
            this.ctx.beginPath();
            this.ctx.arc(100 + i * 15, y + 55, 5, 0, 2 * Math.PI);
            this.ctx.fill();
        }
        
        // 防御状态
        if (player.isDefending) {
            this.ctx.fillStyle = '#008000';
            this.ctx.fillText(
                `防御: ${player.defenseType === 'blood' ? '血挡' : '普挡'}`,
                20, y + 90
            );
        }
    }

    // 渲染按钮
    renderButtons() {
        for (const button of Object.values(this.buttons)) {
            // 检查是否可用
            let isDisabled = false;
            if (this.currentPlayer !== 1) {
                isDisabled = true;
            } else if (button.action === ActionType.FINGER_ATTACK && this.gameState.player1.qi < 1) {
                isDisabled = true;
            } else if (button.action === ActionType.WAVE_ATTACK && this.gameState.player1.qi < 5) {
                isDisabled = true;
            } else if (button.action === ActionType.GRIND_ATTACK && this.gameState.player1.qi < 2) {
                isDisabled = true;
            }
            
            // 绘制按钮背景
            this.ctx.fillStyle = isDisabled ? '#CCCCCC' : '#2196F3';
            this.ctx.fillRect(
                button.x,
                button.y,
                button.width,
                button.height
            );
            
            // 绘制按钮边框
            this.ctx.strokeStyle = isDisabled ? '#999999' : '#1976D2';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(
                button.x,
                button.y,
                button.width,
                button.height
            );
            
            // 绘制按钮文字
            this.ctx.fillStyle = isDisabled ? '#666666' : '#FFFFFF';
            this.ctx.font = '18px Arial';
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