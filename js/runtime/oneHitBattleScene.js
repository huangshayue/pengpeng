import OneHitGameState, { ActionType } from './oneHitGameState.js';
import { ParticleSystem } from '../effects/particleSystem.js';
import { AnimationSystem, Easing } from '../effects/animationSystem.js';
import { CharacterSprite } from '../effects/characterSprite.js';
import OnlineManager from './onlineManager.js';

export default class OneHitBattleScene {
    constructor(ctx, width, height) {
        this.ctx = ctx;
        this.width = width;
        this.height = height;
        
        // 游戏系统
        this.gameState = new OneHitGameState();
        this.particleSystem = new ParticleSystem();
        this.animationSystem = new AnimationSystem();
        
        // 按钮布局
        this.buttons = this.createButtons();
        
        // 游戏状态
        this.isGameStarted = false;
        this.gameMode = null; // 'pve' (人机) 或 'pvp' (人人) 或 'online' (在线)
        
        // 回合制系统
        this.currentTurn = 'player'; // 'player' 或 'ai'
        this.isProcessing = false; // 是否正在处理动作
        this.roundNumber = 1; // 回合数
        
        // PVP模式状态
        this.player1Action = null; // 玩家1选择的动作
        this.player2Action = null; // 玩家2选择的动作
        this.currentPlayer = 1; // 当前操作的玩家 (1 或 2)
        this.actionConfirmed = false; // 是否确认了动作
        
        // 在线对战
        this.onlineManager = null;
        this.isWaitingForOpponent = false;
        this.roomId = null;
        
        // 房间号输入
        this.showingRoomInput = false;
        this.roomInputText = '';
        this.numberButtons = [];
        this.deleteButton = null;
        this.confirmJoinButton = null;
        this.cancelJoinButton = null;
        
        // AI动作显示
        this.currentActionDisplay = null;
        this.actionDisplayTimer = 0;
        this.aiActionAnimation = 0;
        
        // 动画相关
        this.lastTime = Date.now();
        this.gradientOffset = 0;
        
        // 角色精灵
        this.playerSprite = null;
        this.aiSprite = null;
        
        // 初始化
        this.init();
    }

    init() {
        console.log('初始化一击必杀对战场景');
        this.showModeSelection();
    }

    // 重置到模式选择界面
    resetToModeSelection() {
        // 清理游戏状态
        this.isGameStarted = false;
        this.gameMode = null;
        this.gameOverInfo = null;
        this.startButton = null;
        this.shareButton = null;
        this.isWaitingForOpponent = false;
        this.showingRoomInput = false;
        this.roomInputText = '';
        
        // 清理在线状态
        if (this.onlineManager) {
            this.onlineManager.disconnect();
            this.onlineManager = null;
        }
        this.roomId = null;
        
        // 重置回合状态
        this.currentTurn = 'player';
        this.isProcessing = false;
        this.roundNumber = 1;
        
        // 重置PVP状态
        this.player1Action = null;
        this.player2Action = null;
        this.currentPlayer = 1;
        this.actionConfirmed = false;
        
        // 重置游戏状态
        this.gameState.reset();
        
        // 清理精灵
        this.playerSprite = null;
        this.aiSprite = null;
        
        // 重新显示模式选择
        this.showModeSelection();
    }
    
    showModeSelection() {
        const buttonWidth = 240;
        const buttonHeight = 70;
        const spacing = 20;
        const totalHeight = buttonHeight * 4 + spacing * 3;
        const startY = (this.height - totalHeight) / 2;
        
        // 人机对战按钮
        this.pveButton = {
            x: (this.width - buttonWidth) / 2,
            y: startY,
            width: buttonWidth,
            height: buttonHeight,
            text: '🤖 人机对战',
            scale: 1,
            mode: 'pve'
        };
        
        // 本地对战按钮
        this.pvpButton = {
            x: (this.width - buttonWidth) / 2,
            y: startY + buttonHeight + spacing,
            width: buttonWidth,
            height: buttonHeight,
            text: '👥 本地对战',
            scale: 1,
            mode: 'pvp'
        };
        
        // 创建房间按钮
        this.onlineButton = {
            x: (this.width - buttonWidth) / 2,
            y: startY + (buttonHeight + spacing) * 2,
            width: buttonWidth,
            height: buttonHeight,
            text: '🌐 创建房间',
            scale: 1,
            mode: 'online'
        };
        
        // 加入房间按钮
        this.joinRoomButton = {
            x: (this.width - buttonWidth) / 2,
            y: startY + (buttonHeight + spacing) * 3,
            width: buttonWidth,
            height: buttonHeight,
            text: '🔗 加入房间',
            scale: 1,
            mode: 'join'
        };
        
        // 清理房间按钮（调试用，位置在右下角）
        this.cleanRoomButton = {
            x: this.width - 120,
            y: this.height - 60,
            width: 100,
            height: 40,
            text: '清理房间',
            scale: 1,
            mode: 'clean'
        };
        
        // 检查是否从分享链接进入
        const roomId = OnlineManager.getRoomIdFromQuery();
        if (roomId) {
            // 直接加入房间
            this.joinOnlineRoom(roomId);
        }
    }
    
    showStartButton() {
        const buttonWidth = 240;
        const buttonHeight = 70;
        const x = (this.width - buttonWidth) / 2;
        const y = (this.height - buttonHeight) / 2;

        this.startButton = {
            x,
            y,
            width: buttonWidth,
            height: buttonHeight,
            text: '开始对战',
            scale: 1
        };
    }

    startGame(mode) {
        this.isGameStarted = true;
        this.gameMode = mode;
        this.startButton = null;
        this.pveButton = null;
        this.pvpButton = null;
        this.gameState.reset();
        
        // 重置状态
        this.currentTurn = 'player';
        this.isProcessing = false;
        this.roundNumber = 1;
        
        // PVP模式初始化
        if (mode === 'pvp') {
            this.player1Action = null;
            this.player2Action = null;
            this.currentPlayer = 1;
            this.actionConfirmed = false;
        }
        
        // 在线模式初始化
        if (mode === 'online') {
            this.player1Action = null;
            this.player2Action = null;
            this.waitingForOpponent = false;
        }
        
        // 创建角色精灵
        this.playerSprite = new CharacterSprite(this.width / 2, this.height - 150, true);
        this.aiSprite = new CharacterSprite(this.width / 2, 150, false);
        
        // 播放开始动画
        this.animationSystem.createFlash('#4CAF50', 300);
        this.particleSystem.createExplosion(this.width / 2, this.height / 2, '#4CAF50', 30);
        
        const title = mode === 'online' ? '在线对决！' : '生死对决！';
        wx.showToast({
            title: title,
            icon: 'none',
            duration: 1500
        });
    }

    // AI回合
    aiTurn() {
        if (!this.isGameStarted || !this.gameState.player2.isAlive || this.currentTurn !== 'ai') return;
        
        this.isProcessing = true;
        
        // 延迟一下让玩家看清楚
        setTimeout(() => {
            this.performAIAction();
        }, 800);
    }

    // AI执行动作
    performAIAction() {
        const player1 = this.gameState.player1;
        const player2 = this.gameState.player2;
        
        // AI决策逻辑
        let action = null;
        
        // 如果防御被破，不能再防御
        if (player2.defenseBroken) {
            // 只能积气或攻击
            if (player2.qi >= 5 && Math.random() < 0.6) {
                action = ActionType.WAVE_ATTACK;
            } else if (player2.qi >= 2 && Math.random() < 0.3) {
                action = ActionType.GRIND_ATTACK;
            } else if (player2.qi >= 1 && Math.random() < 0.3) {
                action = ActionType.FINGER_ATTACK;
            } else {
                action = ActionType.ACCUMULATE;
            }
        } else {
            // 智能决策
            // 如果玩家正在积气且自己有气，考虑攻击
            if (!player1.isDefending && player2.qi >= 1) {
                if (player2.qi >= 5 && Math.random() < 0.7) {
                    action = ActionType.WAVE_ATTACK;
                } else if (player2.qi >= 1 && Math.random() < 0.5) {
                    action = ActionType.FINGER_ATTACK;
                }
            }
            
            // 如果玩家有很多气，考虑防御
            if (!action && player1.qi >= 3) {
                if (Math.random() < 0.4) {
                    action = Math.random() < 0.3 ? ActionType.BLOOD_DEFENSE : ActionType.NORMAL_DEFENSE;
                }
            }
            
            // 如果玩家在血挡，尝试用磨磨
            if (!action && player1.isDefending && player1.defenseType === 'blood' && player2.qi >= 2) {
                action = ActionType.GRIND_ATTACK;
            }
            
            // 如果当前在防御，有概率切换
            if (!action && player2.isDefending && Math.random() < 0.2) {
                if (player2.qi >= 1) {
                    action = ActionType.FINGER_ATTACK;
                } else {
                    action = ActionType.ACCUMULATE;
                }
            }
            
            // 默认积气
            if (!action) {
                if (!player2.isDefending || Math.random() < 0.3) {
                    action = ActionType.ACCUMULATE;
                } else {
                    // 保持防御
                    return;
                }
            }
        }
        
        // 执行动作
        this.executeAIAction(action);
    }

    // 执行AI动作
    executeAIAction(action) {
        const success = this.gameState.handleAction(2, action);
        
        if (success) {
            // 显示AI动作
            this.showActionDisplay('AI', action);
            this.actionDisplayTimer = 2500;
            this.handleActionEffects(2, action);
            
            // 检查游戏结束
            const winner = this.gameState.checkGameOver();
            if (winner > 0) {
                setTimeout(() => this.endGame(winner), 1000);
            } else {
                // 回到玩家回合
                setTimeout(() => {
                    this.currentTurn = 'player';
                    this.isProcessing = false;
                    this.roundNumber++;
                }, 1500);
            }
        }
    }

    // 处理玩家触摸
    handleTouch(x, y) {
        // 处理输入房间号界面
        if (this.showingRoomInput) {
            if (this.confirmJoinButton && this.checkModeButton(x, y, this.confirmJoinButton)) {
                this.handleJoinWithRoomId();
                return;
            }
            if (this.cancelJoinButton && this.checkModeButton(x, y, this.cancelJoinButton)) {
                this.showingRoomInput = false;
                this.roomInputText = '';
                this.showModeSelection();
                return;
            }
            // 处理数字按钮点击
            for (let i = 0; i < 10; i++) {
                const button = this.numberButtons[i];
                if (button && this.checkModeButton(x, y, button)) {
                    if (this.roomInputText.length < 6) {
                        this.roomInputText += i.toString();
                    }
                    return;
                }
            }
            // 处理删除按钮
            if (this.deleteButton && this.checkModeButton(x, y, this.deleteButton)) {
                if (this.roomInputText.length > 0) {
                    this.roomInputText = this.roomInputText.slice(0, -1);
                }
                return;
            }
            return;
        }
        
        // 处理模式选择
        if (!this.gameMode && !this.isGameStarted) {
            if (this.pveButton && this.checkModeButton(x, y, this.pveButton)) {
                this.pveButton.scale = 0.9;
                setTimeout(() => {
                    this.startGame('pve');
                }, 100);
                return;
            }
            if (this.pvpButton && this.checkModeButton(x, y, this.pvpButton)) {
                this.pvpButton.scale = 0.9;
                setTimeout(() => {
                    this.startGame('pvp');
                }, 100);
                return;
            }
            if (this.onlineButton && this.checkModeButton(x, y, this.onlineButton)) {
                this.onlineButton.scale = 0.9;
                setTimeout(() => {
                    this.startOnlineGame();
                }, 100);
                return;
            }
            if (this.joinRoomButton && this.checkModeButton(x, y, this.joinRoomButton)) {
                this.joinRoomButton.scale = 0.9;
                setTimeout(() => {
                    this.showRoomInputScreen();
                }, 100);
                return;
            }
            if (this.cleanRoomButton && this.checkModeButton(x, y, this.cleanRoomButton)) {
                this.cleanRoomButton.scale = 0.9;
                setTimeout(async () => {
                    await this.debugCleanMyRooms();
                    this.cleanRoomButton.scale = 1;
                }, 100);
                return;
            }
            return;
        }
        
        // 处理分享按钮
        if (this.shareButton && this.checkModeButton(x, y, this.shareButton)) {
            this.shareRoom();
            return;
        }
        
        const action = this.checkButtonClick(x, y);
        if (!action) return;

        if (action === 'start') {
            this.startButton.scale = 0.9;
            setTimeout(() => {
                this.startButton && (this.startButton.scale = 1);
                this.startGame(this.gameMode);
            }, 100);
            return;
        }

        if (!this.isGameStarted) {
            wx.showToast({
                title: '游戏未开始',
                icon: 'none'
            });
            return;
        }

        // PVP模式处理
        if (this.gameMode === 'pvp') {
            this.handlePVPTouch(action);
            return;
        }
        
        // 在线模式处理
        if (this.gameMode === 'online') {
            this.handleOnlineTouch(action);
            return;
        }
        
        // PVE模式处理
        if (!this.gameState.player1.isAlive) {
            wx.showToast({
                title: '你已失败',
                icon: 'none'
            });
            return;
        }

        // 检查是否玩家回合
        if (this.currentTurn !== 'player') {
            wx.showToast({
                title: 'AI回合中...',
                icon: 'none'
            });
            return;
        }
        
        // 检查是否正在处理
        if (this.isProcessing) {
            wx.showToast({
                title: '处理中...',
                icon: 'none'
            });
            return;
        }

        // 检查是否可以使用
        if (!this.canUseAction(action, 1)) {
            if (this.gameState.player1.defenseBroken && 
                (action === ActionType.NORMAL_DEFENSE || action === ActionType.BLOOD_DEFENSE)) {
                wx.showToast({
                    title: '防御已破损',
                    icon: 'none'
                });
            } else {
                wx.showToast({
                    title: '气不足',
                    icon: 'none'
                });
            }
            return;
        }

        // 按钮动画
        const button = Object.values(this.buttons).find(b => b.action === action);
        if (button) {
            button.scale = 0.8;
            setTimeout(() => button.scale = 1, 150);
        }

        // 执行玩家动作
        this.executePlayerAction(action);
    }

    // 在线模式触摸处理
    handleOnlineTouch(action) {
        // 检查是否已选择动作
        if (this.player1Action) {
            wx.showToast({
                title: '等待对手选择',
                icon: 'none'
            });
            return;
        }
        
        // 检查是否可以使用该动作
        if (!this.canUseAction(action, 1)) {
            const player = this.gameState.player1;
            if (player.defenseBroken && 
                (action === ActionType.NORMAL_DEFENSE || action === ActionType.BLOOD_DEFENSE)) {
                wx.showToast({
                    title: '防御已破损',
                    icon: 'none'
                });
            } else {
                wx.showToast({
                    title: '气不足',
                    icon: 'none'
                });
            }
            return;
        }
        
        // 设置动作并发送给对手
        this.player1Action = action;
        this.onlineManager.sendAction(action);
        
        // 按钮动画
        const button = Object.values(this.buttons).find(b => b.action === action);
        if (button) {
            button.scale = 0.8;
            setTimeout(() => button.scale = 1, 150);
        }
        
        wx.showToast({
            title: '已选择，等待对手',
            icon: 'none'
        });
        
        // 如果对手已经选择了，执行回合
        if (this.player2Action) {
            this.executeOnlineRound();
        }
    }
    
    // PVP模式触摸处理
    handlePVPTouch(action) {
        // 处理确认按钮
        if (action === 'confirm') {
            this.confirmPVPAction();
            return;
        }
        
        // 处理切换玩家按钮
        if (action === 'switch') {
            this.switchPlayer();
            return;
        }
        
        // 检查当前玩家是否已经选择了动作
        if (this.currentPlayer === 1 && this.player1Action) {
            wx.showToast({
                title: '请先确认或切换玩家',
                icon: 'none'
            });
            return;
        }
        
        if (this.currentPlayer === 2 && this.player2Action) {
            wx.showToast({
                title: '请先确认或切换玩家',
                icon: 'none'
            });
            return;
        }
        
        // 检查是否可以使用该动作
        if (!this.canUseAction(action, this.currentPlayer)) {
            const player = this.currentPlayer === 1 ? this.gameState.player1 : this.gameState.player2;
            if (player.defenseBroken && 
                (action === ActionType.NORMAL_DEFENSE || action === ActionType.BLOOD_DEFENSE)) {
                wx.showToast({
                    title: '防御已破损',
                    icon: 'none'
                });
            } else {
                wx.showToast({
                    title: '气不足',
                    icon: 'none'
                });
            }
            return;
        }
        
        // 设置当前玩家的动作（但不执行）
        if (this.currentPlayer === 1) {
            this.player1Action = action;
        } else {
            this.player2Action = action;
        }
        
        // 按钮动画
        const button = Object.values(this.buttons).find(b => b.action === action);
        if (button) {
            button.scale = 0.8;
            setTimeout(() => button.scale = 1, 150);
        }
        
        wx.showToast({
            title: `玩家${this.currentPlayer}已选择`,
            icon: 'none',
            duration: 1000
        });
    }
    
    // 确认PVP动作
    confirmPVPAction() {
        if (this.currentPlayer === 1) {
            if (!this.player1Action) {
                wx.showToast({
                    title: '请先选择动作',
                    icon: 'none'
                });
                return;
            }
            // 切换到玩家2
            this.currentPlayer = 2;
            wx.showToast({
                title: '玩家2请选择',
                icon: 'none'
            });
        } else {
            if (!this.player2Action) {
                wx.showToast({
                    title: '请先选择动作',
                    icon: 'none'
                });
                return;
            }
            // 两个玩家都选择完毕，执行动作
            this.executePVPRound();
        }
    }
    
    // 切换玩家
    switchPlayer() {
        if (this.currentPlayer === 1 && !this.player1Action) {
            wx.showToast({
                title: '玩家1未选择动作',
                icon: 'none'
            });
            return;
        }
        if (this.currentPlayer === 2 && !this.player2Action) {
            wx.showToast({
                title: '玩家2未选择动作',
                icon: 'none'
            });
            return;
        }
        
        this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
        wx.showToast({
            title: `切换到玩家${this.currentPlayer}`,
            icon: 'none'
        });
    }
    
    // 执行PVP回合
    executePVPRound() {
        this.isProcessing = true;
        
        // 显示双方动作
        this.showActionDisplay('玩家1', this.player1Action);
        setTimeout(() => {
            this.showActionDisplay('玩家2', this.player2Action);
        }, 500);
        
        // 延迟后同时执行动作
        setTimeout(() => {
            // 执行玩家1的动作
            const success1 = this.gameState.handleAction(1, this.player1Action);
            if (success1) {
                this.handleActionEffects(1, this.player1Action);
            }
            
            // 执行玩家2的动作
            const success2 = this.gameState.handleAction(2, this.player2Action);
            if (success2) {
                this.handleActionEffects(2, this.player2Action);
            }
            
            // 检查游戏结束
            const winner = this.gameState.checkGameOver();
            if (winner > 0) {
                this.endGame(winner);
            } else {
                // 重置动作选择
                this.player1Action = null;
                this.player2Action = null;
                this.currentPlayer = 1;
                this.isProcessing = false;
                this.roundNumber++;
                
                wx.showToast({
                    title: '新回合开始',
                    icon: 'none'
                });
            }
        }, 2000);
    }
    
    // 执行玩家动作
    executePlayerAction(action) {
        this.isProcessing = true;
        const success = this.gameState.handleAction(1, action);
        
        if (success) {
            this.handleActionEffects(1, action);
            
            // 检查游戏结束
            const winner = this.gameState.checkGameOver();
            if (winner > 0) {
                this.endGame(winner);
            } else if (this.gameMode === 'pve') {
                // 只有PVE模式才切换到AI回合
                this.currentTurn = 'ai';
                setTimeout(() => {
                    this.aiTurn();
                }, 500);
            } else if (this.gameMode === 'online') {
                // 在线模式等待对手动作
                this.isProcessing = false;
                this.currentTurn = 'waiting';
            }
        } else {
            this.isProcessing = false;
        }
    }

    // 更新
    update() {
        const currentTime = Date.now();
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        
        // 回合制不需要更新AI和冷却
        
        // 更新粒子系统
        this.particleSystem.update();
        
        // 更新动画系统
        this.animationSystem.update(deltaTime);
        
        // 更新背景渐变
        this.gradientOffset += 0.001;
        if (this.gradientOffset > 1) this.gradientOffset = 0;
        
        // 更新按钮动画
        Object.values(this.buttons).forEach(button => {
            if (button.scale < 1) {
                button.scale = Math.min(1, button.scale + deltaTime * 0.005);
            }
        });
        
        // 更新动作显示计时器
        if (this.actionDisplayTimer > 0) {
            this.actionDisplayTimer -= deltaTime;
            if (this.actionDisplayTimer <= 0) {
                this.currentActionDisplay = null;
                this.aiActionAnimation = 0;
            }
        }
        
        // 更新AI动作动画
        if (this.currentActionDisplay && this.currentActionDisplay.player === 'AI') {
            this.aiActionAnimation += deltaTime * 0.005;
        }
        
        // 更新角色精灵
        if (this.playerSprite) {
            this.playerSprite.update(deltaTime);
        }
        if (this.aiSprite) {
            this.aiSprite.update(deltaTime);
        }
    }

    // 渲染
    render() {
        this.update();
        
        const shakeOffset = this.animationSystem.getShakeOffset();
        this.ctx.save();
        this.ctx.translate(shakeOffset.x, shakeOffset.y);
        
        this.renderBackground();
        
        // 渲染模式选择或等待界面
        if (this.showingRoomInput) {
            this.renderRoomInputScreen();
        } else if (!this.gameMode && !this.isGameStarted) {
            this.renderModeSelection();
        } else if (this.isWaitingForOpponent) {
            this.renderWaitingScreen();
        } else if (!this.isGameStarted && this.startButton) {
            this.renderStartButton();
        } else if (this.isGameStarted) {
            // 先渲染角色
            if (this.playerSprite) {
                this.playerSprite.draw(this.ctx);
            }
            if (this.aiSprite) {
                this.aiSprite.draw(this.ctx);
            }
            
            this.renderGameUI();
            this.renderButtons();
            
            if (this.gameMode === 'pvp') {
                this.renderPVPStatus();
                this.renderPVPControls();
            } else {
                this.renderBattleStatus();
            }
            
            this.renderActionDisplay();
        }
        
        // 渲染游戏结束信息
        if (this.gameOverInfo) {
            this.renderGameOverScreen();
        }
        
        // 渲染粒子效果
        this.particleSystem.draw(this.ctx);
        
        // 渲染动画效果
        this.animationSystem.draw(this.ctx, this.width, this.height);
        
        this.ctx.restore();
    }

    // 渲染战斗状态
    renderBattleStatus() {
        this.ctx.save();
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = 'bold 20px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.shadowColor = '#000000';
        this.ctx.shadowBlur = 3;
        
        // 显示回合数
        this.ctx.fillStyle = '#2196F3';
        this.ctx.fillText(`回合 ${this.roundNumber}`, this.width / 2, this.height / 2 - 20);
        
        // 显示当前轮次
        let turnText = '';
        let turnColor = '#4CAF50';
        
        if (this.currentTurn === 'player') {
            turnText = '你的回合';
            turnColor = '#4CAF50';
        } else if (this.currentTurn === 'ai') {
            turnText = 'AI回合';
            turnColor = '#FF5722';
        }
        
        this.ctx.fillStyle = turnColor;
        this.ctx.font = 'bold 24px Arial';
        this.ctx.fillText(turnText, this.width / 2, this.height / 2 + 10);
        
        // 显示一击必杀标志
        this.ctx.fillStyle = '#FF5722';
        this.ctx.font = '16px Arial';
        this.ctx.fillText('⚔️ 一击必杀', this.width / 2, this.height / 2 + 35);
        
        this.ctx.restore();
    }

    // === 以下是辅助方法和UI渲染方法 ===

    isAttackAction(action) {
        return action === ActionType.FINGER_ATTACK || 
               action === ActionType.WAVE_ATTACK || 
               action === ActionType.GRIND_ATTACK;
    }

    canUseAction(action, playerNumber = 1) {
        const player = playerNumber === 1 ? this.gameState.player1 : this.gameState.player2;
        
        // 如果防御已破，不能使用防御
        if (player.defenseBroken && 
            (action === ActionType.NORMAL_DEFENSE || action === ActionType.BLOOD_DEFENSE)) {
            return false;
        }
        
        // 检查气的消耗
        const qiCost = this.gameState.getQiCost(action);
        return player.qi >= qiCost;
    }

    showActionDisplay(playerName, action) {
        const actionNames = {
            [ActionType.ACCUMULATE]: '积气',
            [ActionType.NORMAL_DEFENSE]: '普挡(防5)',
            [ActionType.BLOOD_DEFENSE]: '血挡(无敌)',
            [ActionType.FINGER_ATTACK]: '一指(攻1)',
            [ActionType.WAVE_ATTACK]: '发波(攻10)',
            [ActionType.GRIND_ATTACK]: '磨磨(破血挡)'
        };
        
        this.currentActionDisplay = {
            player: playerName,
            action: actionNames[action] || action,
            icon: this.getActionIcon(action)
        };
    }

    getActionIcon(action) {
        const icons = {
            [ActionType.ACCUMULATE]: '⚡',
            [ActionType.NORMAL_DEFENSE]: '🛡️',
            [ActionType.BLOOD_DEFENSE]: '💗',
            [ActionType.FINGER_ATTACK]: '👆',
            [ActionType.WAVE_ATTACK]: '🌊',
            [ActionType.GRIND_ATTACK]: '⚔️'
        };
        return icons[action] || '❓';
    }

    handleActionEffects(player, action) {
        const isPlayer1 = player === 1;
        const x = this.width / 2;
        const y = isPlayer1 ? this.height - 200 : 100;
        const sprite = isPlayer1 ? this.playerSprite : this.aiSprite;
        const targetSprite = isPlayer1 ? this.aiSprite : this.playerSprite;

        switch (action) {
            case ActionType.ACCUMULATE:
                sprite.setState('charge', 1000);
                this.particleSystem.createEnergyGather(x, y, 15);
                this.animationSystem.createFlash('#2196F3', 200);
                break;
                
            case ActionType.NORMAL_DEFENSE:
            case ActionType.BLOOD_DEFENSE:
                sprite.setState('defend', 2000);
                this.particleSystem.createShield(x, y, 80);
                if (action === ActionType.BLOOD_DEFENSE) {
                    this.animationSystem.createFlash('#E91E63', 300);
                }
                break;
                
            case ActionType.FINGER_ATTACK:
            case ActionType.WAVE_ATTACK:
            case ActionType.GRIND_ATTACK:
                sprite.setState('attack', 800);
                
                const target = isPlayer1 ? this.gameState.player2 : this.gameState.player1;
                const attackPower = this.gameState.getAttackPower(action);
                
                // 判断是否击败对手
                if (!target.isDefending || 
                    (action === ActionType.GRIND_ATTACK && target.defenseType === 'blood') ||
                    attackPower > target.defenseValue) {
                    targetSprite.setState('defeat', 3000);
                    this.particleSystem.createExplosion(x, isPlayer1 ? 100 : this.height - 200, '#FF0000', 50);
                    this.animationSystem.createFlash('#FF0000', 500);
                } else if (attackPower === target.defenseValue) {
                    // 防御被破
                    targetSprite.setState('hurt', 1000);
                    this.particleSystem.createExplosion(x, isPlayer1 ? 100 : this.height - 200, '#FFC107', 30);
                }
                
                // 攻击特效
                if (action === ActionType.FINGER_ATTACK) {
                    this.particleSystem.createExplosion(x, isPlayer1 ? 100 : this.height - 200, '#FFD700', 10);
                    this.animationSystem.createShake(3, 200);
                } else if (action === ActionType.WAVE_ATTACK) {
                    this.particleSystem.createExplosion(x, isPlayer1 ? 100 : this.height - 200, '#FF6B6B', 35);
                    this.animationSystem.createShake(10, 500);
                    this.animationSystem.createFlash('#FF6B6B', 400);
                } else if (action === ActionType.GRIND_ATTACK) {
                    this.particleSystem.createExplosion(x, isPlayer1 ? 100 : this.height - 200, '#9C27B0', 20);
                    if (target.defenseType === 'blood') {
                        // 破血挡特效
                        this.animationSystem.createFlash('#9C27B0', 800);
                        this.particleSystem.createExplosion(x, isPlayer1 ? 100 : this.height - 200, '#000000', 60);
                    }
                }
                break;
        }
    }

    // 查看房间列表（调试用）
    async debugListRooms() {
        try {
            const res = await wx.cloud.callFunction({
                name: 'listRooms',
                data: { action: 'list' }
            });
            
            console.log('=== 当前房间列表 ===');
            console.log('我的OpenId:', res.result.myOpenId);
            console.log('房间数量:', res.result.count);
            
            res.result.rooms.forEach(room => {
                console.log(`房间 ${room.roomId}:`, {
                    状态: room.status,
                    是我的房间: room.isMyRoom,
                    房主: room.hostOpenId ? room.hostOpenId.substring(0, 10) + '...' : '无',
                    访客: room.guestOpenId ? room.guestOpenId.substring(0, 10) + '...' : '无',
                    创建时间: room.createTime
                });
            });
            
            return res.result;
        } catch (error) {
            console.error('查看房间列表失败:', error);
        }
    }
    
    // 清理我的房间（调试用）
    async debugCleanMyRooms() {
        try {
            const res = await wx.cloud.callFunction({
                name: 'listRooms',
                data: { action: 'cleanMy' }
            });
            
            console.log('清理结果:', res.result.message);
            wx.showToast({
                title: res.result.message,
                icon: 'success'
            });
            
            return res.result;
        } catch (error) {
            console.error('清理房间失败:', error);
        }
    }
    
    // 开始在线游戏
    async startOnlineGame() {
        // 先清理我的旧房间
        await this.debugCleanMyRooms();
        
        this.gameMode = 'online';
        this.onlineManager = new OnlineManager();
        
        // 设置回调
        this.onlineManager.onOpponentJoined = () => {
            this.isWaitingForOpponent = false;
            // 房主不立即开始游戏，等待对方发送gameStart消息
            console.log('对手加入房间');
        };
        
        this.onlineManager.onGameStart = () => {
            console.log('收到游戏开始信号');
            this.isWaitingForOpponent = false;
            this.startGame('online');
        };
        
        this.onlineManager.onOpponentAction = (action) => {
            this.handleOnlineOpponentAction(action);
        };
        
        this.onlineManager.onOpponentLeft = () => {
            wx.showToast({
                title: '对手已离开',
                icon: 'none'
            });
            this.endGame(1); // 对手离开算己方胜利
        };
        
        // 创建房间
        this.roomId = await this.onlineManager.createRoom();
        this.isWaitingForOpponent = true;
        
        // 显示等待界面
        this.showWaitingScreen();
    }
    
    // 加入在线房间
    async joinOnlineRoom(roomId) {
        console.log('开始加入房间:', roomId);
        
        // 先查看房间列表，了解当前房间状态
        await this.debugListRooms();
        
        this.gameMode = 'online';
        this.onlineManager = new OnlineManager();
        
        // 设置回调
        this.onlineManager.onOpponentAction = (action) => {
            this.handleOnlineOpponentAction(action);
        };
        
        this.onlineManager.onOpponentLeft = () => {
            wx.showToast({
                title: '对手已离开',
                icon: 'none'
            });
            this.endGame(1);
        };
        
        try {
            // 加入房间
            const result = await this.onlineManager.joinRoom(roomId);
            if (result) {
                console.log('成功加入房间:', roomId, '是否房主:', result.isHost);
                this.roomId = roomId;
                
                if (result.isHost) {
                    // 是房主重新加入自己的房间
                    wx.showToast({
                        title: '这是你的房间',
                        icon: 'none',
                        duration: 2000
                    });
                    this.isWaitingForOpponent = true;
                    this.showWaitingScreen();
                } else {
                    // 真正加入别人的房间
                    wx.showToast({
                        title: '加入成功！',
                        icon: 'success',
                        duration: 1500
                    });
                    this.startGame('online');
                    
                    // 通知房主游戏开始
                    this.onlineManager.sendMessage({
                        type: 'gameStart',
                        playerId: this.onlineManager.playerId
                    });
                }
            } else {
                console.log('加入房间失败:', roomId);
                // 这个else分支实际上不会执行，因为onlineManager会抛出异常
                wx.showToast({
                    title: '加入房间失败',
                    icon: 'none',
                    duration: 2000
                });
                // 加入失败，返回模式选择
                this.gameMode = null;
                this.onlineManager = null;
                this.showModeSelection();
            }
        } catch (error) {
            console.error('加入房间出错:', error);
            const errorMsg = error.message || '网络错误，请重试';
            wx.showToast({
                title: errorMsg,
                icon: 'none',
                duration: 2500
            });
            // 出错，返回模式选择
            this.gameMode = null;
            this.onlineManager = null;
            this.showModeSelection();
        }
    }
    
    // 显示房间号输入界面
    showRoomInputScreen() {
        this.showingRoomInput = true;
        this.roomInputText = '';
        
        // 清除模式选择按钮
        this.pveButton = null;
        this.pvpButton = null;
        this.onlineButton = null;
        this.joinRoomButton = null;
        
        // 创建数字键盘
        this.numberButtons = [];
        const numWidth = 60;
        const numHeight = 60;
        const numStartX = (this.width - numWidth * 3 - 20) / 2;
        const numStartY = this.height / 2;
        
        // 1-9数字按钮
        for (let i = 1; i <= 9; i++) {
            const row = Math.floor((i - 1) / 3);
            const col = (i - 1) % 3;
            this.numberButtons[i] = {
                x: numStartX + col * (numWidth + 10),
                y: numStartY + row * (numHeight + 10),
                width: numWidth,
                height: numHeight,
                text: i.toString(),
                value: i
            };
        }
        
        // 0按钮
        this.numberButtons[0] = {
            x: numStartX + (numWidth + 10),
            y: numStartY + 3 * (numHeight + 10),
            width: numWidth,
            height: numHeight,
            text: '0',
            value: 0
        };
        
        // 删除按钮
        this.deleteButton = {
            x: numStartX + 2 * (numWidth + 10),
            y: numStartY + 3 * (numHeight + 10),
            width: numWidth,
            height: numHeight,
            text: '⌫',
            action: 'delete'
        };
        
        // 确认和取消按钮
        this.confirmJoinButton = {
            x: (this.width - 240) / 2,
            y: numStartY + 5 * (numHeight + 10),
            width: 110,
            height: 50,
            text: '加入',
            color: '#4CAF50'
        };
        
        this.cancelJoinButton = {
            x: (this.width - 240) / 2 + 130,
            y: numStartY + 5 * (numHeight + 10),
            width: 110,
            height: 50,
            text: '取消',
            color: '#F44336'
        };
    }
    
    // 处理加入房间
    handleJoinWithRoomId() {
        if (this.roomInputText.length !== 6) {
            wx.showToast({
                title: '请输入6位房间号',
                icon: 'none'
            });
            return;
        }
        
        console.log('尝试加入房间:', this.roomInputText);
        wx.showToast({
            title: '正在加入房间...',
            icon: 'loading',
            duration: 2000
        });
        
        this.showingRoomInput = false;
        this.joinOnlineRoom(this.roomInputText);
    }
    
    // 显示等待界面
    showWaitingScreen() {
        // 清除模式选择按钮
        this.pveButton = null;
        this.pvpButton = null;
        this.onlineButton = null;
        this.joinRoomButton = null;
        
        // 显示分享按钮
        this.shareButton = {
            x: (this.width - 240) / 2,
            y: this.height / 2 + 50,
            width: 240,
            height: 70,
            text: '📤 邀请好友',
            scale: 1
        };
    }
    
    // 分享房间
    shareRoom() {
        if (this.onlineManager && this.roomId) {
            wx.shareAppMessage({
                title: '来一场生死对决吧！',
                path: `/game.js?roomId=${this.roomId}`,
                imageUrl: '/images/share.png',
                success: () => {
                    wx.showToast({
                        title: '分享成功',
                        icon: 'success'
                    });
                }
            });
        }
    }
    
    // 处理在线对手动作
    handleOnlineOpponentAction(action) {
        if (this.gameMode !== 'online') return;
        
        // 在线模式下，对手是玩家2
        this.player2Action = action;
        
        // 如果自己也选择了动作，执行回合
        if (this.player1Action && this.player2Action) {
            this.executeOnlineRound();
        }
    }
    
    // 执行在线回合
    executeOnlineRound() {
        this.isProcessing = true;
        
        // 显示双方动作
        this.showActionDisplay('你', this.player1Action);
        setTimeout(() => {
            this.showActionDisplay('对手', this.player2Action);
        }, 500);
        
        // 延迟后执行动作
        setTimeout(() => {
            // 执行玩家1的动作
            const success1 = this.gameState.handleAction(1, this.player1Action);
            if (success1) {
                this.handleActionEffects(1, this.player1Action);
            }
            
            // 执行玩家2的动作
            const success2 = this.gameState.handleAction(2, this.player2Action);
            if (success2) {
                this.handleActionEffects(2, this.player2Action);
            }
            
            // 检查游戏结束
            const winner = this.gameState.checkGameOver();
            if (winner > 0) {
                this.endGame(winner);
            } else {
                // 重置动作选择
                this.player1Action = null;
                this.player2Action = null;
                this.isProcessing = false;
                this.roundNumber++;
                
                wx.showToast({
                    title: '新回合开始',
                    icon: 'none'
                });
            }
        }, 2000);
    }
    
    endGame(winner) {
        this.isGameStarted = false;
        
        // 设置游戏结束状态
        let message, subMessage;
        if (this.gameMode === 'pvp') {
            message = winner === 1 ? '玩家1胜利！' : '玩家2胜利！';
            subMessage = winner === 1 ? '玩家1击败了玩家2！' : '玩家2击败了玩家1！';
        } else {
            message = winner === 1 ? '胜利！' : '失败！';
            subMessage = winner === 1 ? '你击败了AI！' : 'AI击败了你！';
        }
        
        this.gameOverInfo = {
            winner: winner,
            message: message,
            subMessage: subMessage,
            displayTime: 5000 // 显示5秒
        };
        
        // 角色胜负动画
        if (winner === 1) {
            this.playerSprite && this.playerSprite.setState('victory', 3000);
            this.aiSprite && this.aiSprite.setState('defeat', 3000);
            this.particleSystem.createExplosion(this.width / 2, this.height - 150, '#4CAF50', 50);
            this.animationSystem.createFlash('#4CAF50', 500);
            
            // 胜利特效
            for (let i = 0; i < 10; i++) {
                setTimeout(() => {
                    this.particleSystem.createExplosion(
                        Math.random() * this.width,
                        Math.random() * this.height,
                        '#FFD700', 20
                    );
                }, i * 200);
            }
            
            // 胜利震动
            wx.vibrateShort({ type: 'heavy' });
            
            // 胜利Toast
            wx.showToast({
                title: '🎉 胜利！',
                icon: 'success',
                duration: 3000
            });
        } else {
            this.playerSprite && this.playerSprite.setState('defeat', 3000);
            this.aiSprite && this.aiSprite.setState('victory', 3000);
            this.particleSystem.createExplosion(this.width / 2, 150, '#F44336', 50);
            this.animationSystem.createFlash('#F44336', 500);
            
            // 失败震动
            wx.vibrateLong();
            
            // 失败Toast
            wx.showToast({
                title: '💀 失败！',
                icon: 'none',
                duration: 3000
            });
        }
        
        // 延迟显示模态框
        setTimeout(() => {
            // 根据游戏模式调整文本
            let modalTitle, modalContent;
            if (this.gameMode === 'pvp') {
                modalTitle = winner === 1 ? '🎉 玩家1胜利' : '🎉 玩家2胜利';
                modalContent = winner === 1 ? 
                    '玩家1成功击败了玩家2！\n是否再来一局？' : 
                    '玩家2成功击败了玩家1！\n是否再来一局？';
            } else if (this.gameMode === 'online') {
                modalTitle = winner === 1 ? '🎉 游戏胜利' : '💀 游戏失败';
                modalContent = winner === 1 ? 
                    '恭喜你！你成功击败了对手！\n是否再来一局？' : 
                    '很遗憾，你被对手击败了。\n是否重新挑战？';
            } else {
                modalTitle = winner === 1 ? '🎉 游戏胜利' : '💀 游戏失败';
                modalContent = winner === 1 ? 
                    '恭喜你！你成功击败了AI！\n是否再来一局？' : 
                    '很遗憾，你被AI击败了。\n是否重新挑战？';
            }
            
            wx.showModal({
                title: modalTitle,
                content: modalContent,
                confirmText: '再来一局',
                cancelText: '返回主页',
                success: (res) => {
                    // 先清除游戏结束信息
                    this.gameOverInfo = null;
                    
                    if (res.confirm) {
                        // 保存当前游戏模式
                        const currentMode = this.gameMode;
                        
                        // 如果是在线模式，断开连接
                        if (this.gameMode === 'online' && this.onlineManager) {
                            this.onlineManager.disconnect();
                            this.onlineManager = null;
                            this.isWaitingForOpponent = false;
                            this.roomId = null;
                        }
                        
                        // 重新开始同模式游戏
                        if (currentMode === 'online') {
                            // 在线模式回到模式选择界面
                            this.resetToModeSelection();
                        } else {
                            // 其他模式直接重新开始
                            this.startGame(currentMode);
                        }
                    } else {
                        // 返回主页面
                        this.resetToModeSelection();
                    }
                }
            });
        }, 1500);
    }

    createButtons() {
        const buttonWidth = this.width / 3 - 10;
        const buttonHeight = 55;
        const buttonY = this.height - 200;
        const spacing = 15;
        
        // PVP模式下创建确认和切换按钮
        if (this.gameMode === 'pvp') {
            const controlButtonWidth = (this.width - 30) / 2;
            const controlButtonHeight = 50;
            const controlButtonY = this.height - 60;
            
            this.confirmButton = {
                x: 10,
                y: controlButtonY,
                width: controlButtonWidth,
                height: controlButtonHeight,
                text: '✅ 确认选择',
                color: '#4CAF50'
            };
            
            this.switchButton = {
                x: controlButtonWidth + 20,
                y: controlButtonY,
                width: controlButtonWidth,
                height: controlButtonHeight,
                text: '🔄 切换玩家',
                color: '#2196F3'
            };
        }

        return {
            accumulate: {
                x: 5,
                y: buttonY,
                width: buttonWidth,
                height: buttonHeight,
                text: '积气',
                subtext: '+1气',
                icon: '⚡',
                action: ActionType.ACCUMULATE,
                color: '#2196F3',
                scale: 1
            },
            normalDefense: {
                x: buttonWidth + 10,
                y: buttonY,
                width: buttonWidth,
                height: buttonHeight,
                text: '普挡',
                subtext: '防5',
                icon: '🛡️',
                action: ActionType.NORMAL_DEFENSE,
                color: '#4CAF50',
                scale: 1
            },
            bloodDefense: {
                x: (buttonWidth + 5) * 2,
                y: buttonY,
                width: buttonWidth,
                height: buttonHeight,
                text: '血挡',
                subtext: '怕磨磨',
                icon: '💗',
                action: ActionType.BLOOD_DEFENSE,
                color: '#E91E63',
                scale: 1
            },
            fingerAttack: {
                x: 5,
                y: buttonY + buttonHeight + spacing,
                width: buttonWidth,
                height: buttonHeight,
                text: '一指',
                subtext: '攻1耗1',
                icon: '👆',
                action: ActionType.FINGER_ATTACK,
                color: '#FFD700',
                scale: 1
            },
            waveAttack: {
                x: buttonWidth + 10,
                y: buttonY + buttonHeight + spacing,
                width: buttonWidth,
                height: buttonHeight,
                text: '发波',
                subtext: '攻10耗5',
                icon: '🌊',
                action: ActionType.WAVE_ATTACK,
                color: '#FF6B6B',
                scale: 1
            },
            grindAttack: {
                x: (buttonWidth + 5) * 2,
                y: buttonY + buttonHeight + spacing,
                width: buttonWidth,
                height: buttonHeight,
                text: '磨磨',
                subtext: '攻1耗2',
                icon: '⚔️',
                action: ActionType.GRIND_ATTACK,
                color: '#9C27B0',
                scale: 1
            }
        };
    }

    checkModeButton(x, y, button) {
        return x >= button.x && x < button.x + button.width &&
               y >= button.y && y < button.y + button.height;
    }
    
    checkButtonClick(x, y) {
        if (!this.isGameStarted && this.startButton) {
            if (x >= this.startButton.x && x < this.startButton.x + this.startButton.width &&
                y >= this.startButton.y && y < this.startButton.y + this.startButton.height) {
                return 'start';
            }
            return null;
        }
        
        // PVP模式的确认和切换按钮
        if (this.gameMode === 'pvp' && this.isGameStarted) {
            if (this.confirmButton && 
                x >= this.confirmButton.x && x < this.confirmButton.x + this.confirmButton.width &&
                y >= this.confirmButton.y && y < this.confirmButton.y + this.confirmButton.height) {
                return 'confirm';
            }
            if (this.switchButton && 
                x >= this.switchButton.x && x < this.switchButton.x + this.switchButton.width &&
                y >= this.switchButton.y && y < this.switchButton.y + this.switchButton.height) {
                return 'switch';
            }
        }

        for (const [key, button] of Object.entries(this.buttons)) {
            const bx = button.x + button.width / 2;
            const by = button.y + button.height / 2;
            const bw = button.width * button.scale / 2;
            const bh = button.height * button.scale / 2;
            
            if (x >= bx - bw && x < bx + bw &&
                y >= by - bh && y < by + bh) {
                return button.action;
            }
        }
        return null;
    }

    // 渲染相关方法
    renderBackground() {
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
        gradient.addColorStop(0, '#1a1a2e');
        gradient.addColorStop(0.5, '#16213e');
        gradient.addColorStop(1, '#0f3460');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        // 危险感的红色边缘
        const dangerGradient = this.ctx.createRadialGradient(
            this.width / 2, this.height / 2, 0,
            this.width / 2, this.height / 2, Math.max(this.width, this.height) / 2
        );
        dangerGradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
        dangerGradient.addColorStop(0.7, 'rgba(0, 0, 0, 0)');
        dangerGradient.addColorStop(1, 'rgba(255, 0, 0, 0.2)');
        this.ctx.fillStyle = dangerGradient;
        this.ctx.fillRect(0, 0, this.width, this.height);
    }

    renderModeSelection() {
        // 标题
        this.ctx.save();
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = 'bold 36px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        this.ctx.shadowBlur = 10;
        this.ctx.fillText('选择游戏模式', this.width / 2, 60);
        this.ctx.restore();
        
        // 渲染模式按钮
        this.renderModeButton(this.pveButton);
        this.renderModeButton(this.pvpButton);
        this.renderModeButton(this.onlineButton);
        this.renderModeButton(this.joinRoomButton);
        
        // 渲染清理按钮（调试用）
        if (this.cleanRoomButton) {
            this.ctx.save();
            this.ctx.globalAlpha = 0.6;
            this.renderModeButton(this.cleanRoomButton);
            this.ctx.restore();
        }
    }
    
    renderRoomInputScreen() {
        // 标题
        this.ctx.save();
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = 'bold 32px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        this.ctx.shadowBlur = 10;
        this.ctx.fillText('输入房间号', this.width / 2, 80);
        
        // 显示输入框
        const inputBoxWidth = 240;
        const inputBoxHeight = 60;
        const inputBoxX = (this.width - inputBoxWidth) / 2;
        const inputBoxY = 120;
        
        // 输入框背景
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        this.ctx.strokeStyle = '#FFFFFF';
        this.ctx.lineWidth = 2;
        this.roundRect(inputBoxX, inputBoxY, inputBoxWidth, inputBoxHeight, 10);
        this.ctx.fill();
        this.ctx.stroke();
        
        // 显示输入的数字
        this.ctx.font = 'bold 36px monospace';
        this.ctx.fillStyle = '#FFD700';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        let displayText = this.roomInputText || '';
        // 补充下划线
        for (let i = displayText.length; i < 6; i++) {
            displayText += '_';
        }
        this.ctx.fillText(displayText, this.width / 2, inputBoxY + inputBoxHeight / 2);
        
        // 提示文字
        this.ctx.font = '16px Arial';
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.fillText('请输入6位数字房间号', this.width / 2, inputBoxY + inputBoxHeight + 30);
        
        this.ctx.restore();
        
        // 渲染数字键盘
        for (let i = 0; i <= 9; i++) {
            const button = this.numberButtons[i];
            if (button) {
                this.renderNumberButton(button);
            }
        }
        
        // 渲染删除按钮
        if (this.deleteButton) {
            this.renderNumberButton(this.deleteButton);
        }
        
        // 渲染确认和取消按钮
        if (this.confirmJoinButton) {
            this.renderControlButton(this.confirmJoinButton);
        }
        if (this.cancelJoinButton) {
            this.renderControlButton(this.cancelJoinButton);
        }
    }
    
    renderNumberButton(button) {
        this.ctx.save();
        
        // 按钮背景
        const gradient = this.ctx.createLinearGradient(button.x, button.y, button.x + button.width, button.y);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.2)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0.1)');
        
        this.ctx.fillStyle = gradient;
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        this.ctx.lineWidth = 1;
        this.roundRect(button.x, button.y, button.width, button.height, 8);
        this.ctx.fill();
        this.ctx.stroke();
        
        // 按钮文字
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = 'bold 24px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(button.text, button.x + button.width / 2, button.y + button.height / 2);
        
        this.ctx.restore();
    }
    
    renderWaitingScreen() {
        // 标题
        this.ctx.save();
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = 'bold 32px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        this.ctx.shadowBlur = 10;
        this.ctx.fillText('等待对手加入...', this.width / 2, 100);
        
        // 房间号
        if (this.roomId) {
            this.ctx.font = 'bold 24px Arial';
            this.ctx.fillStyle = '#FFD700';
            this.ctx.fillText(`房间号: ${this.roomId}`, this.width / 2, 150);
        }
        
        // 加载动画
        const time = Date.now() / 1000;
        const dots = Math.floor(time % 3) + 1;
        let loadingText = '等待中';
        for (let i = 0; i < dots; i++) {
            loadingText += '.';
        }
        this.ctx.font = '20px Arial';
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.fillText(loadingText, this.width / 2, this.height / 2);
        
        this.ctx.restore();
        
        // 渲染分享按钮
        if (this.shareButton) {
            this.renderModeButton(this.shareButton);
        }
    }
    
    renderModeButton(button) {
        if (!button) return;
        
        this.ctx.save();
        this.ctx.translate(button.x + button.width / 2, button.y + button.height / 2);
        this.ctx.scale(button.scale, button.scale);
        
        const gradient = this.ctx.createLinearGradient(-button.width / 2, 0, button.width / 2, 0);
        if (button.mode === 'pve') {
            gradient.addColorStop(0, '#4CAF50');
            gradient.addColorStop(1, '#388E3C');
        } else {
            gradient.addColorStop(0, '#2196F3');
            gradient.addColorStop(1, '#1976D2');
        }
        
        this.ctx.fillStyle = gradient;
        this.ctx.shadowColor = button.mode === 'pve' ? 'rgba(76, 175, 80, 0.5)' : 'rgba(33, 150, 243, 0.5)';
        this.ctx.shadowBlur = 20;
        this.roundRect(-button.width / 2, -button.height / 2, button.width, button.height, 15);
        this.ctx.fill();
        
        this.ctx.strokeStyle = button.mode === 'pve' ? '#2E7D32' : '#1565C0';
        this.ctx.lineWidth = 3;
        this.ctx.stroke();
        
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = 'bold 24px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        this.ctx.shadowBlur = 4;
        this.ctx.fillText(button.text, 0, 0);
        
        this.ctx.restore();
    }
    
    renderPVPStatus() {
        this.ctx.save();
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = 'bold 20px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.shadowColor = '#000000';
        this.ctx.shadowBlur = 3;
        
        // 显示回合数
        this.ctx.fillStyle = '#2196F3';
        this.ctx.fillText(`回合 ${this.roundNumber}`, this.width / 2, this.height / 2 - 40);
        
        // 显示当前操作玩家
        let statusText = '';
        let statusColor = '#4CAF50';
        
        if (this.currentPlayer === 1) {
            statusText = this.player1Action ? '玩家1已选择' : '玩家1选择中...';
            statusColor = this.player1Action ? '#FFC107' : '#4CAF50';
        } else {
            statusText = this.player2Action ? '玩家2已选择' : '玩家2选择中...';
            statusColor = this.player2Action ? '#FFC107' : '#FF5722';
        }
        
        this.ctx.fillStyle = statusColor;
        this.ctx.font = 'bold 24px Arial';
        this.ctx.fillText(statusText, this.width / 2, this.height / 2);
        
        // 显示选择状态
        if (this.player1Action || this.player2Action) {
            this.ctx.font = '16px Arial';
            this.ctx.fillStyle = '#FFD700';
            let actionStatus = [];
            if (this.player1Action) actionStatus.push('P1✓');
            if (this.player2Action) actionStatus.push('P2✓');
            this.ctx.fillText(actionStatus.join(' '), this.width / 2, this.height / 2 + 25);
        }
        
        // 显示对战模式标志
        this.ctx.fillStyle = '#FF5722';
        this.ctx.font = '16px Arial';
        this.ctx.fillText('👥 人人对战', this.width / 2, this.height / 2 + 50);
        
        this.ctx.restore();
    }
    
    renderPVPControls() {
        // 渲染确认按钮
        if (this.confirmButton) {
            this.renderControlButton(this.confirmButton);
        }
        
        // 渲染切换按钮
        if (this.switchButton) {
            this.renderControlButton(this.switchButton);
        }
    }
    
    renderControlButton(button) {
        this.ctx.save();
        
        const gradient = this.ctx.createLinearGradient(button.x, button.y, button.x + button.width, button.y);
        gradient.addColorStop(0, button.color);
        gradient.addColorStop(1, this.adjustColor(button.color, -20));
        
        this.ctx.fillStyle = gradient;
        this.ctx.shadowColor = button.color;
        this.ctx.shadowBlur = 10;
        this.roundRect(button.x, button.y, button.width, button.height, 10);
        this.ctx.fill();
        
        this.ctx.strokeStyle = this.adjustColor(button.color, -30);
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = 'bold 18px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(button.text, button.x + button.width / 2, button.y + button.height / 2);
        
        this.ctx.restore();
    }
    
    renderStartButton() {
        const button = this.startButton;
        const scale = button.scale;
        
        this.ctx.save();
        this.ctx.translate(button.x + button.width / 2, button.y + button.height / 2);
        this.ctx.scale(scale, scale);
        
        const gradient = this.ctx.createLinearGradient(-button.width / 2, 0, button.width / 2, 0);
        gradient.addColorStop(0, '#F44336');
        gradient.addColorStop(1, '#D32F2F');
        
        this.ctx.fillStyle = gradient;
        this.ctx.shadowColor = 'rgba(244, 67, 54, 0.5)';
        this.ctx.shadowBlur = 20;
        this.roundRect(-button.width / 2, -button.height / 2, button.width, button.height, 15);
        this.ctx.fill();
        
        this.ctx.strokeStyle = '#B71C1C';
        this.ctx.lineWidth = 3;
        this.ctx.stroke();
        
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = 'bold 28px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        this.ctx.shadowBlur = 4;
        this.ctx.fillText(button.text, 0, 0);
        
        this.ctx.restore();
    }

    renderGameUI() {
        if (this.gameMode === 'pvp') {
            // PVP模式：玩家2状态（上方）
            this.renderPlayerCard('玩家2', 2, 40, false);
            // 玩家1状态（下方）
            this.renderPlayerCard('玩家1', 1, this.height - 280, true);
        } else {
            // PVE模式：AI状态（上方）
            this.renderPlayerCard('AI', 2, 40, false);
            // 玩家状态（下方）
            this.renderPlayerCard('你', 1, this.height - 280, true);
        }
    }

    renderPlayerCard(name, playerNumber, y, isPlayer) {
        const player = playerNumber === 1 ? this.gameState.player1 : this.gameState.player2;
        if (!player) return;
        
        const cardWidth = this.width - 40;
        const cardHeight = 120;
        const x = 20;
        
        this.ctx.save();
        
        // 如果玩家死亡，显示暗色
        const isDead = !player.isAlive;
        
        const gradient = this.ctx.createLinearGradient(x, y, x + cardWidth, y);
        if (isDead) {
            gradient.addColorStop(0, 'rgba(50, 50, 50, 0.3)');
            gradient.addColorStop(1, 'rgba(30, 30, 30, 0.2)');
        } else if (isPlayer) {
            gradient.addColorStop(0, 'rgba(33, 150, 243, 0.2)');
            gradient.addColorStop(1, 'rgba(33, 150, 243, 0.1)');
        } else {
            gradient.addColorStop(0, 'rgba(244, 67, 54, 0.2)');
            gradient.addColorStop(1, 'rgba(244, 67, 54, 0.1)');
        }
        
        this.ctx.fillStyle = gradient;
        this.ctx.shadowColor = isDead ? 'rgba(0, 0, 0, 0.5)' : 
                               (isPlayer ? 'rgba(33, 150, 243, 0.3)' : 'rgba(244, 67, 54, 0.3)');
        this.ctx.shadowBlur = 15;
        this.roundRect(x, y, cardWidth, cardHeight, 15);
        this.ctx.fill();
        
        this.ctx.strokeStyle = isDead ? 'rgba(100, 100, 100, 0.5)' : 
                               (isPlayer ? 'rgba(33, 150, 243, 0.5)' : 'rgba(244, 67, 54, 0.5)');
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        
        // 状态文字
        this.ctx.fillStyle = isDead ? '#666666' : '#FFFFFF';
        this.ctx.font = 'bold 24px Arial';
        this.ctx.textAlign = 'left';
        
        let statusText = name;
        if (isDead) {
            statusText += ' ☠️ 已失败';
        } else {
            statusText += ` - ${this.gameState.getStatusSummary(playerNumber)}`;
        }
        this.ctx.fillText(statusText, x + 20, y + 35);
        
        // 生存状态
        if (!isDead) {
            // 气值显示
            this.renderQiIndicator(x + 20, y + 65, player.qi);
            
            // 防御状态
            if (player.isDefending) {
                this.renderDefenseIndicator(x + 20, y + 90, player.defenseType, player.defenseValue);
            }
            
            // 防御破损标记
            if (player.defenseBroken) {
                this.ctx.fillStyle = '#FF5722';
                this.ctx.font = 'bold 16px Arial';
                this.ctx.fillText('⚠️ 防御已破', x + cardWidth - 120, y + 90);
            }
        }
        
        this.ctx.restore();
    }

    renderQiIndicator(x, y, qi) {
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = '16px Arial';
        this.ctx.textAlign = 'left';
        this.ctx.fillText('气:', x, y);
        
        for (let i = 0; i < Math.min(qi, 10); i++) {
            const ballX = x + 30 + i * 20;
            const gradient = this.ctx.createRadialGradient(ballX, y - 5, 0, ballX, y - 5, 8);
            gradient.addColorStop(0, '#64B5F6');
            gradient.addColorStop(0.7, '#2196F3');
            gradient.addColorStop(1, '#1976D2');
            
            this.ctx.fillStyle = gradient;
            this.ctx.shadowColor = 'rgba(33, 150, 243, 0.6)';
            this.ctx.shadowBlur = 8;
            this.ctx.beginPath();
            this.ctx.arc(ballX, y - 5, 8, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }

    renderDefenseIndicator(x, y, type, value) {
        this.ctx.fillStyle = type === 'blood' ? '#E91E63' : '#4CAF50';
        this.ctx.font = 'bold 16px Arial';
        this.ctx.textAlign = 'left';
        
        let defenseText = type === 'blood' ? '血挡(无敌)' : `普挡(防${value})`;
        this.ctx.fillText(`防御: ${defenseText}`, x, y);
        
        // 防御图标
        const icon = type === 'blood' ? '💗' : '🛡️';
        this.ctx.font = '20px Arial';
        this.ctx.fillText(icon, x + 150, y);
    }

    renderButtons() {
        for (const button of Object.values(this.buttons)) {
            this.renderButton(button);
        }
    }

    renderButton(button) {
        const player = this.gameState.player1;
        const isDisabled = !player.isAlive || 
                          this.currentTurn !== 'player' || 
                          this.isProcessing ||
                          !this.canUseAction(button.action, 1);
        
        this.ctx.save();
        this.ctx.translate(button.x + button.width / 2, button.y + button.height / 2);
        this.ctx.scale(button.scale, button.scale);
        
        const gradient = this.ctx.createLinearGradient(-button.width / 2, 0, button.width / 2, 0);
        if (isDisabled) {
            gradient.addColorStop(0, '#424242');
            gradient.addColorStop(1, '#303030');
        } else {
            const color = button.color;
            gradient.addColorStop(0, color);
            gradient.addColorStop(1, this.adjustColor(color, -20));
        }
        
        this.ctx.fillStyle = gradient;
        this.ctx.shadowColor = isDisabled ? 'rgba(0, 0, 0, 0.3)' : button.color;
        this.ctx.shadowBlur = isDisabled ? 5 : 15;
        this.roundRect(-button.width / 2, -button.height / 2, button.width, button.height, 10);
        this.ctx.fill();
        
        this.ctx.strokeStyle = isDisabled ? '#212121' : this.adjustColor(button.color, -30);
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        
        this.ctx.fillStyle = isDisabled ? '#757575' : '#FFFFFF';
        this.ctx.font = '24px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(button.icon, 0, -5);
        
        this.ctx.font = 'bold 14px Arial';
        this.ctx.fillText(button.text, 0, 15);
        
        if (button.subtext) {
            this.ctx.font = '10px Arial';
            this.ctx.fillStyle = isDisabled ? '#616161' : '#FFE082';
            this.ctx.fillText(button.subtext, 0, 28);
        }
        
        this.ctx.restore();
    }

    renderActionDisplay() {
        if (!this.currentActionDisplay || this.currentActionDisplay.player !== 'AI') return;
        
        const display = this.currentActionDisplay;
        const alpha = this.actionDisplayTimer > 2000 ? 1 : Math.max(0, this.actionDisplayTimer / 500);
        
        this.ctx.save();
        this.ctx.globalAlpha = alpha;
        
        const scale = 1 + Math.sin(this.aiActionAnimation) * 0.05;
        
        const boxWidth = 350;
        const boxHeight = 120;
        const boxX = (this.width - boxWidth) / 2;
        const boxY = 180;
        
        this.ctx.save();
        this.ctx.translate(boxX + boxWidth / 2, boxY + boxHeight / 2);
        this.ctx.scale(scale, scale);
        this.ctx.translate(-(boxX + boxWidth / 2), -(boxY + boxHeight / 2));
        
        let bgColor1, bgColor2, shadowColor;
        if (display.action.includes('攻')) {
            bgColor1 = 'rgba(255, 61, 0, 0.95)';
            bgColor2 = 'rgba(255, 111, 0, 0.95)';
            shadowColor = 'rgba(255, 61, 0, 0.8)';
        } else if (display.action.includes('挡')) {
            bgColor1 = 'rgba(156, 39, 176, 0.95)';
            bgColor2 = 'rgba(171, 71, 188, 0.95)';
            shadowColor = 'rgba(156, 39, 176, 0.8)';
        } else {
            bgColor1 = 'rgba(33, 150, 243, 0.95)';
            bgColor2 = 'rgba(66, 165, 245, 0.95)';
            shadowColor = 'rgba(33, 150, 243, 0.8)';
        }
        
        const gradient = this.ctx.createLinearGradient(boxX, boxY, boxX, boxY + boxHeight);
        gradient.addColorStop(0, bgColor1);
        gradient.addColorStop(0.5, bgColor2);
        gradient.addColorStop(1, bgColor1);
        
        this.ctx.fillStyle = gradient;
        this.ctx.shadowColor = shadowColor;
        this.ctx.shadowBlur = 40;
        this.roundRect(boxX, boxY, boxWidth, boxHeight, 20);
        this.ctx.fill();
        
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
        this.ctx.lineWidth = 4;
        this.ctx.stroke();
        
        this.ctx.restore();
        
        const iconSize = 60 + Math.sin(this.aiActionAnimation * 2) * 5;
        this.ctx.font = `${iconSize}px Arial`;
        this.ctx.textAlign = 'center';
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        this.ctx.shadowBlur = 10;
        this.ctx.fillText(display.icon, boxX + 70, boxY + 75);
        
        this.ctx.textAlign = 'left';
        this.ctx.font = 'bold 18px Arial';
        this.ctx.fillStyle = '#FFE082';
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        this.ctx.shadowBlur = 3;
        this.ctx.fillText('⚠️ AI行动', boxX + 130, boxY + 35);
        
        this.ctx.font = 'bold 32px Arial';
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        this.ctx.shadowBlur = 5;
        this.ctx.fillText(display.action, boxX + 130, boxY + 75);
        
        this.ctx.restore();
    }

    // 渲染游戏结束画面
    renderGameOverScreen() {
        if (!this.gameOverInfo) return;
        
        // 半透明背景覆盖
        this.ctx.save();
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        // 游戏结束面板
        const panelWidth = this.width - 60;
        const panelHeight = 300;
        const panelX = 30;
        const panelY = (this.height - panelHeight) / 2;
        
        // 面板背景
        const isVictory = this.gameOverInfo.winner === 1;
        const gradient = this.ctx.createLinearGradient(panelX, panelY, panelX, panelY + panelHeight);
        
        if (isVictory) {
            gradient.addColorStop(0, 'rgba(76, 175, 80, 0.95)');
            gradient.addColorStop(0.5, 'rgba(129, 199, 132, 0.95)');
            gradient.addColorStop(1, 'rgba(76, 175, 80, 0.95)');
        } else {
            gradient.addColorStop(0, 'rgba(244, 67, 54, 0.95)');
            gradient.addColorStop(0.5, 'rgba(239, 83, 80, 0.95)');
            gradient.addColorStop(1, 'rgba(244, 67, 54, 0.95)');
        }
        
        this.ctx.fillStyle = gradient;
        this.ctx.shadowColor = isVictory ? 'rgba(76, 175, 80, 0.8)' : 'rgba(244, 67, 54, 0.8)';
        this.ctx.shadowBlur = 30;
        this.roundRect(panelX, panelY, panelWidth, panelHeight, 20);
        this.ctx.fill();
        
        // 边框
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
        this.ctx.lineWidth = 3;
        this.ctx.stroke();
        
        // 主标题
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        this.ctx.shadowBlur = 10;
        
        // 大图标
        this.ctx.font = '80px Arial';
        this.ctx.fillText(isVictory ? '🏆' : '💀', this.width / 2, panelY + 80);
        
        // 主文字
        this.ctx.font = 'bold 48px Arial';
        this.ctx.fillText(this.gameOverInfo.message, this.width / 2, panelY + 160);
        
        // 副文字
        this.ctx.font = '24px Arial';
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        this.ctx.fillText(this.gameOverInfo.subMessage, this.width / 2, panelY + 210);
        
        // 提示文字
        this.ctx.font = '18px Arial';
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        this.ctx.fillText('等待选择下一步操作...', this.width / 2, panelY + 250);
        
        this.ctx.restore();
    }

    roundRect(x, y, width, height, radius) {
        this.ctx.beginPath();
        this.ctx.moveTo(x + radius, y);
        this.ctx.lineTo(x + width - radius, y);
        this.ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        this.ctx.lineTo(x + width, y + height - radius);
        this.ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        this.ctx.lineTo(x + radius, y + height);
        this.ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        this.ctx.lineTo(x, y + radius);
        this.ctx.quadraticCurveTo(x, y, x + radius, y);
        this.ctx.closePath();
    }

    adjustColor(color, amount) {
        const num = parseInt(color.replace('#', ''), 16);
        const r = Math.max(0, Math.min(255, (num >> 16) + amount));
        const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amount));
        const b = Math.max(0, Math.min(255, (num & 0x0000FF) + amount));
        return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
    }
}