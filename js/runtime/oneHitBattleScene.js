import OneHitGameState, { ActionType } from './oneHitGameState.js';
import { ParticleSystem } from '../effects/particleSystem.js';
import { AnimationSystem, Easing } from '../effects/animationSystem.js';
import { CharacterSprite } from '../effects/characterSprite.js';

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
        
        // 回合制系统
        this.currentTurn = 'player'; // 'player' 或 'ai'
        this.isProcessing = false; // 是否正在处理动作
        this.roundNumber = 1; // 回合数
        
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
        this.showStartButton();
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

    startGame() {
        this.isGameStarted = true;
        this.startButton = null;
        this.gameState.reset();
        
        // 重置状态
        this.currentTurn = 'player';
        this.isProcessing = false;
        this.roundNumber = 1;
        
        // 创建角色精灵
        this.playerSprite = new CharacterSprite(this.width / 2, this.height - 150, true);
        this.aiSprite = new CharacterSprite(this.width / 2, 150, false);
        
        // 播放开始动画
        this.animationSystem.createFlash('#4CAF50', 300);
        this.particleSystem.createExplosion(this.width / 2, this.height / 2, '#4CAF50', 30);
        
        wx.showToast({
            title: '生死对决！',
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
        const action = this.checkButtonClick(x, y);
        if (!action) return;

        if (action === 'start') {
            this.startButton.scale = 0.9;
            setTimeout(() => {
                this.startButton && (this.startButton.scale = 1);
                this.startGame();
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
            } else {
                // 切换到AI回合
                this.currentTurn = 'ai';
                setTimeout(() => {
                    this.aiTurn();
                }, 500);
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
        
        if (!this.isGameStarted && this.startButton) {
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
            this.renderBattleStatus();
            this.renderActionDisplay();
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

    endGame(winner) {
        this.isGameStarted = false;
        
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
        } else {
            this.playerSprite && this.playerSprite.setState('defeat', 3000);
            this.aiSprite && this.aiSprite.setState('victory', 3000);
            this.particleSystem.createExplosion(this.width / 2, 150, '#F44336', 50);
            this.animationSystem.createFlash('#F44336', 500);
        }
        
        // 延迟显示开始按钮
        setTimeout(() => {
            this.showStartButton();
        }, 2000);
        
        wx.showModal({
            title: '游戏结束',
            content: winner === 1 ? '🎉 你赢了！' : '💀 你输了！',
            showCancel: false
        });
    }

    createButtons() {
        const buttonWidth = this.width / 3 - 10;
        const buttonHeight = 55;
        const buttonY = this.height - 200;
        const spacing = 15;

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

    checkButtonClick(x, y) {
        if (!this.isGameStarted && this.startButton) {
            if (x >= this.startButton.x && x < this.startButton.x + this.startButton.width &&
                y >= this.startButton.y && y < this.startButton.y + this.startButton.height) {
                return 'start';
            }
            return null;
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
        // AI状态（上方）
        this.renderPlayerCard('AI', 2, 40, false);
        // 玩家状态（下方）
        this.renderPlayerCard('你', 1, this.height - 280, true);
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