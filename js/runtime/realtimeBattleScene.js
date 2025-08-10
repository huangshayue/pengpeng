import GameState, { ActionType } from './gameState.js';
import { ParticleSystem } from '../effects/particleSystem.js';
import { AnimationSystem, Easing } from '../effects/animationSystem.js';
import { CharacterSprite } from '../effects/characterSprite.js';

export default class RealtimeBattleScene {
    constructor(ctx, width, height) {
        this.ctx = ctx;
        this.width = width;
        this.height = height;
        
        // 游戏系统
        this.gameState = new GameState();
        this.particleSystem = new ParticleSystem();
        this.animationSystem = new AnimationSystem();
        
        // 按钮布局
        this.buttons = this.createButtons();
        
        // 游戏状态
        this.isGameStarted = false;
        
        // 实时对战系统
        this.playerCooldown = 0;  // 玩家动作冷却
        this.aiNextActionTime = 2000; // AI下次行动时间
        
        // 防御状态管理（防御是持续的）
        this.playerDefenseState = null; // null, 'normal', 'blood'
        this.aiDefenseState = null;
        
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
        console.log('初始化实时对战场景');
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
        this.playerCooldown = 0;
        this.aiNextActionTime = 2000;
        this.playerDefenseState = null;
        this.aiDefenseState = null;
        
        // 创建角色精灵
        this.playerSprite = new CharacterSprite(this.width / 2, this.height - 150, true);
        this.aiSprite = new CharacterSprite(this.width / 2, 150, false);
        
        // 播放开始动画
        this.animationSystem.createFlash('#4CAF50', 300);
        this.particleSystem.createExplosion(this.width / 2, this.height / 2, '#4CAF50', 30);
        
        wx.showToast({
            title: '对战开始！',
            icon: 'success',
            duration: 1500
        });
    }

    // AI独立思考和行动
    updateAI(deltaTime) {
        if (!this.isGameStarted) return;
        
        // 更新AI行动计时
        this.aiNextActionTime -= deltaTime;
        
        if (this.aiNextActionTime <= 0) {
            this.performAIAction();
            // 设置下次行动时间（1.5-3秒随机）
            this.aiNextActionTime = 1500 + Math.random() * 1500;
        }
    }

    // AI执行动作
    performAIAction() {
        const player1 = this.gameState.player1;
        const player2 = this.gameState.player2;
        
        // AI决策逻辑
        let action = null;
        
        // 如果当前在防御，有概率解除防御（20%）
        if (this.aiDefenseState && Math.random() < 0.2) {
            this.aiDefenseState = null;
            player2.isDefending = false;
            player2.defenseType = null;
            console.log('AI解除防御');
            return;
        }
        
        // 智能决策
        if (player1.qi >= 5 && !this.aiDefenseState) {
            // 玩家气很多，考虑防御
            if (Math.random() < 0.6) {
                action = Math.random() < 0.7 ? ActionType.NORMAL_DEFENSE : ActionType.BLOOD_DEFENSE;
            }
        }
        
        if (!action && player2.qi >= 5) {
            // 自己气够，发波攻击
            if (Math.random() < 0.7) {
                action = ActionType.WAVE_ATTACK;
            }
        }
        
        if (!action && player2.qi >= 2) {
            // 如果玩家在血挡，用磨磨
            if (this.playerDefenseState === 'blood') {
                action = ActionType.GRIND_ATTACK;
            } else if (Math.random() < 0.4) {
                action = ActionType.GRIND_ATTACK;
            }
        }
        
        if (!action && player2.qi >= 1 && Math.random() < 0.3) {
            action = ActionType.FINGER_ATTACK;
        }
        
        // 默认积气或防御
        if (!action) {
            if (Math.random() < 0.7) {
                action = ActionType.ACCUMULATE;
            } else {
                action = ActionType.NORMAL_DEFENSE;
            }
        }
        
        // 执行动作
        this.executeAIAction(action);
    }

    // 执行AI动作
    executeAIAction(action) {
        const success = this.gameState.handleAction(2, action);
        
        if (success) {
            // 更新防御状态
            if (action === ActionType.NORMAL_DEFENSE) {
                this.aiDefenseState = 'normal';
            } else if (action === ActionType.BLOOD_DEFENSE) {
                this.aiDefenseState = 'blood';
            } else if (this.isAttackAction(action) || action === ActionType.ACCUMULATE) {
                // 攻击或积气时解除防御
                this.aiDefenseState = null;
                this.gameState.player2.isDefending = false;
                this.gameState.player2.defenseType = null;
            }
            
            // 显示AI动作
            this.showActionDisplay('AI', action);
            this.actionDisplayTimer = 2500;
            this.handleActionEffects(2, action);
            
            // 检查游戏结束
            const winner = this.gameState.checkGameOver();
            if (winner > 0) {
                setTimeout(() => this.endGame(winner), 1500);
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

        // 检查冷却
        if (this.playerCooldown > 0) {
            wx.showToast({
                title: `冷却中 ${Math.ceil(this.playerCooldown/1000)}s`,
                icon: 'none'
            });
            return;
        }

        // 检查是否可以使用
        if (!this.canUseAction(action, 1)) {
            wx.showToast({
                title: '气不足',
                icon: 'none'
            });
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
        const success = this.gameState.handleAction(1, action);
        
        if (success) {
            // 更新防御状态
            if (action === ActionType.NORMAL_DEFENSE) {
                this.playerDefenseState = 'normal';
            } else if (action === ActionType.BLOOD_DEFENSE) {
                this.playerDefenseState = 'blood';
            } else if (this.isAttackAction(action) || action === ActionType.ACCUMULATE) {
                // 攻击或积气时解除防御
                this.playerDefenseState = null;
                this.gameState.player1.isDefending = false;
                this.gameState.player1.defenseType = null;
            }
            
            this.handleActionEffects(1, action);
            
            // 设置冷却时间
            if (this.isAttackAction(action)) {
                this.playerCooldown = 800; // 攻击动作0.8秒冷却
            } else {
                this.playerCooldown = 500; // 其他动作0.5秒冷却
            }
            
            // 检查游戏结束
            const winner = this.gameState.checkGameOver();
            if (winner > 0) {
                this.endGame(winner);
            }
        }
    }

    // 更新
    update() {
        const currentTime = Date.now();
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        
        // 更新玩家冷却
        if (this.playerCooldown > 0) {
            this.playerCooldown = Math.max(0, this.playerCooldown - deltaTime);
        }
        
        // 更新AI
        this.updateAI(deltaTime);
        
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
        this.ctx.font = 'bold 18px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.shadowColor = '#000000';
        this.ctx.shadowBlur = 3;
        
        // 显示实时对战
        this.ctx.fillText('实时对战', this.width / 2, this.height / 2);
        
        // 显示冷却状态
        if (this.playerCooldown > 0) {
            this.ctx.fillStyle = '#FFC107';
            this.ctx.font = '16px Arial';
            this.ctx.fillText(`冷却: ${(this.playerCooldown/1000).toFixed(1)}s`, this.width / 2, this.height / 2 + 25);
        }
        
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
        switch (action) {
            case ActionType.FINGER_ATTACK:
                return player.qi >= 1;
            case ActionType.WAVE_ATTACK:
                return player.qi >= 5;
            case ActionType.GRIND_ATTACK:
                return player.qi >= 2;
            default:
                return true;
        }
    }

    showActionDisplay(playerName, action) {
        const actionNames = {
            [ActionType.ACCUMULATE]: '积气',
            [ActionType.NORMAL_DEFENSE]: '普挡',
            [ActionType.BLOOD_DEFENSE]: '血挡',
            [ActionType.FINGER_ATTACK]: '一指攻击',
            [ActionType.WAVE_ATTACK]: '发波攻击',
            [ActionType.GRIND_ATTACK]: '磨磨攻击'
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
                break;
                
            case ActionType.FINGER_ATTACK:
            case ActionType.WAVE_ATTACK:
            case ActionType.GRIND_ATTACK:
                sprite.setState('attack', 800);
                const target = isPlayer1 ? this.gameState.player2 : this.gameState.player1;
                // 只有造成伤害时才显示受伤动画
                if (!target.isDefending || 
                    (action === ActionType.WAVE_ATTACK && target.defenseType === 'normal') ||
                    (action === ActionType.GRIND_ATTACK && target.defenseType === 'blood')) {
                    targetSprite.setState('hurt', 500);
                }
                
                // 攻击特效
                if (action === ActionType.FINGER_ATTACK) {
                    this.particleSystem.createExplosion(x, isPlayer1 ? 100 : this.height - 200, '#FFD700', 10);
                    this.animationSystem.createShake(3, 200);
                } else if (action === ActionType.WAVE_ATTACK) {
                    this.particleSystem.createExplosion(x, isPlayer1 ? 100 : this.height - 200, '#FF6B6B', 25);
                    this.animationSystem.createShake(8, 400);
                    this.animationSystem.createFlash('#FF6B6B', 300);
                } else if (action === ActionType.GRIND_ATTACK) {
                    this.particleSystem.createExplosion(x, isPlayer1 ? 100 : this.height - 200, '#9C27B0', 15);
                    if (target.defenseType === 'blood') {
                        // 破血挡特效
                        this.animationSystem.createFlash('#9C27B0', 500);
                        this.particleSystem.createExplosion(x, isPlayer1 ? 100 : this.height - 200, '#FF0000', 40);
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
            content: winner === 1 ? '🎉 你赢了！' : '💔 你输了！',
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
                subtext: '1气',
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
                subtext: '5气',
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
                subtext: '2气',
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
        const hue = (this.gradientOffset * 360) % 360;
        gradient.addColorStop(0, `hsl(${hue}, 30%, 15%)`);
        gradient.addColorStop(0.5, `hsl(${(hue + 30) % 360}, 35%, 20%)`);
        gradient.addColorStop(1, `hsl(${(hue + 60) % 360}, 30%, 15%)`);
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        // 网格背景
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
        this.ctx.lineWidth = 1;
        for (let i = 0; i < this.width; i += 30) {
            this.ctx.beginPath();
            this.ctx.moveTo(i, 0);
            this.ctx.lineTo(i, this.height);
            this.ctx.stroke();
        }
        for (let i = 0; i < this.height; i += 30) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, i);
            this.ctx.lineTo(this.width, i);
            this.ctx.stroke();
        }
    }

    renderStartButton() {
        const button = this.startButton;
        const scale = button.scale;
        
        this.ctx.save();
        this.ctx.translate(button.x + button.width / 2, button.y + button.height / 2);
        this.ctx.scale(scale, scale);
        
        const gradient = this.ctx.createLinearGradient(-button.width / 2, 0, button.width / 2, 0);
        gradient.addColorStop(0, '#4CAF50');
        gradient.addColorStop(1, '#45B049');
        
        this.ctx.fillStyle = gradient;
        this.ctx.shadowColor = 'rgba(76, 175, 80, 0.5)';
        this.ctx.shadowBlur = 20;
        this.roundRect(-button.width / 2, -button.height / 2, button.width, button.height, 15);
        this.ctx.fill();
        
        this.ctx.strokeStyle = '#388E3C';
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
        this.renderPlayerCard('AI', this.gameState.player2, 40, false);
        // 玩家状态（下方）
        this.renderPlayerCard('你', this.gameState.player1, this.height - 280, true);
    }

    renderPlayerCard(name, player, y, isPlayer) {
        if (!player) return;
        
        const cardWidth = this.width - 40;
        const cardHeight = 120;
        const x = 20;
        
        this.ctx.save();
        const gradient = this.ctx.createLinearGradient(x, y, x + cardWidth, y);
        if (isPlayer) {
            gradient.addColorStop(0, 'rgba(33, 150, 243, 0.2)');
            gradient.addColorStop(1, 'rgba(33, 150, 243, 0.1)');
        } else {
            gradient.addColorStop(0, 'rgba(244, 67, 54, 0.2)');
            gradient.addColorStop(1, 'rgba(244, 67, 54, 0.1)');
        }
        
        this.ctx.fillStyle = gradient;
        this.ctx.shadowColor = isPlayer ? 'rgba(33, 150, 243, 0.3)' : 'rgba(244, 67, 54, 0.3)';
        this.ctx.shadowBlur = 15;
        this.roundRect(x, y, cardWidth, cardHeight, 15);
        this.ctx.fill();
        
        this.ctx.strokeStyle = isPlayer ? 'rgba(33, 150, 243, 0.5)' : 'rgba(244, 67, 54, 0.5)';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        
        // 玩家名称 + 防御状态
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = 'bold 24px Arial';
        this.ctx.textAlign = 'left';
        let statusText = name;
        if (isPlayer && this.playerDefenseState) {
            statusText += ` [${this.playerDefenseState === 'blood' ? '血挡' : '普挡'}]`;
        } else if (!isPlayer && this.aiDefenseState) {
            statusText += ` [${this.aiDefenseState === 'blood' ? '血挡' : '普挡'}]`;
        }
        this.ctx.fillText(statusText, x + 20, y + 30);
        
        // 生命值
        this.renderHealthBar(x + 20, y + 45, 200, 15, player.health);
        
        // 气值
        this.renderQiIndicator(x + 20, y + 75, player.qi);
        
        // 防御状态图标
        if (player.isDefending) {
            this.renderDefenseStatus(x + cardWidth - 80, y + 20, player.defenseType);
        }
        
        this.ctx.restore();
    }

    renderHealthBar(x, y, width, height, health) {
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        this.roundRect(x, y, width, height, height / 2);
        this.ctx.fill();
        
        const healthWidth = (width - 4) * (health / 100);
        const gradient = this.ctx.createLinearGradient(x, y, x + healthWidth, y);
        if (health > 50) {
            gradient.addColorStop(0, '#4CAF50');
            gradient.addColorStop(1, '#66BB6A');
        } else if (health > 20) {
            gradient.addColorStop(0, '#FFC107');
            gradient.addColorStop(1, '#FFD54F');
        } else {
            gradient.addColorStop(0, '#F44336');
            gradient.addColorStop(1, '#EF5350');
        }
        
        this.ctx.fillStyle = gradient;
        this.roundRect(x + 2, y + 2, healthWidth, height - 4, (height - 4) / 2);
        this.ctx.fill();
        
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = 'bold 12px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`${health}/100`, x + width / 2, y + height / 2 + 4);
    }

    renderQiIndicator(x, y, qi) {
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = '14px Arial';
        this.ctx.textAlign = 'left';
        this.ctx.fillText('气:', x, y);
        
        for (let i = 0; i < Math.min(qi, 10); i++) {
            const ballX = x + 30 + i * 18;
            const gradient = this.ctx.createRadialGradient(ballX, y - 5, 0, ballX, y - 5, 7);
            gradient.addColorStop(0, '#64B5F6');
            gradient.addColorStop(0.7, '#2196F3');
            gradient.addColorStop(1, '#1976D2');
            
            this.ctx.fillStyle = gradient;
            this.ctx.shadowColor = 'rgba(33, 150, 243, 0.6)';
            this.ctx.shadowBlur = 8;
            this.ctx.beginPath();
            this.ctx.arc(ballX, y - 5, 7, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }

    renderDefenseStatus(x, y, type) {
        const gradient = this.ctx.createRadialGradient(x, y + 20, 0, x, y + 20, 30);
        if (type === 'blood') {
            gradient.addColorStop(0, 'rgba(233, 30, 99, 0.8)');
            gradient.addColorStop(1, 'rgba(233, 30, 99, 0.2)');
        } else {
            gradient.addColorStop(0, 'rgba(76, 175, 80, 0.8)');
            gradient.addColorStop(1, 'rgba(76, 175, 80, 0.2)');
        }
        
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(x, y + 20, 30, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = 'bold 24px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(type === 'blood' ? '💗' : '🛡️', x, y + 28);
    }

    renderButtons() {
        for (const button of Object.values(this.buttons)) {
            this.renderButton(button);
        }
    }

    renderButton(button) {
        const isDisabled = this.playerCooldown > 0 || !this.canUseAction(button.action, 1);
        
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
        if (display.action.includes('攻击')) {
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
        
        this.ctx.font = 'bold 36px Arial';
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        this.ctx.shadowBlur = 5;
        this.ctx.fillText(display.action + '!', boxX + 130, boxY + 75);
        
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