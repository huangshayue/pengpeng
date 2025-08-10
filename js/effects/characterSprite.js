// 角色精灵动画系统
export class CharacterSprite {
    constructor(x, y, isPlayer = true) {
        this.x = x;
        this.y = y;
        this.isPlayer = isPlayer;
        
        // 基础属性
        this.width = 80;
        this.height = 100;
        this.scale = 1;
        this.rotation = 0;
        
        // 动画状态
        this.currentState = 'idle';
        this.animationTime = 0;
        this.stateTimer = 0;
        
        // 位置偏移（用于动画）
        this.offsetX = 0;
        this.offsetY = 0;
        
        // 颜色主题
        this.primaryColor = isPlayer ? '#2196F3' : '#F44336';
        this.secondaryColor = isPlayer ? '#64B5F6' : '#EF5350';
        
        // 表情
        this.expression = 'normal';
        
        // 特效
        this.effects = [];
    }
    
    // 设置动画状态
    setState(state, duration = 1000) {
        this.currentState = state;
        this.stateTimer = duration;
        this.animationTime = 0;
        
        // 根据状态设置表情
        switch(state) {
            case 'attack':
                this.expression = 'angry';
                break;
            case 'defend':
                this.expression = 'determined';
                break;
            case 'hurt':
                this.expression = 'pain';
                break;
            case 'victory':
                this.expression = 'happy';
                break;
            case 'defeat':
                this.expression = 'sad';
                break;
            case 'charge':
                this.expression = 'focused';
                break;
            default:
                this.expression = 'normal';
        }
    }
    
    // 更新动画
    update(deltaTime) {
        this.animationTime += deltaTime;
        this.stateTimer = Math.max(0, this.stateTimer - deltaTime);
        
        // 如果状态结束，回到idle
        if (this.stateTimer <= 0 && this.currentState !== 'idle') {
            this.setState('idle');
        }
        
        // 根据状态更新动画
        switch(this.currentState) {
            case 'idle':
                this.updateIdle();
                break;
            case 'attack':
                this.updateAttack();
                break;
            case 'defend':
                this.updateDefend();
                break;
            case 'hurt':
                this.updateHurt();
                break;
            case 'charge':
                this.updateCharge();
                break;
            case 'victory':
                this.updateVictory();
                break;
            case 'defeat':
                this.updateDefeat();
                break;
        }
        
        // 更新特效
        this.effects = this.effects.filter(effect => {
            effect.time += deltaTime;
            return effect.time < effect.duration;
        });
    }
    
    // 待机动画
    updateIdle() {
        this.offsetY = Math.sin(this.animationTime * 0.002) * 5;
        this.scale = 1 + Math.sin(this.animationTime * 0.003) * 0.02;
    }
    
    // 攻击动画
    updateAttack() {
        const progress = (this.animationTime % 500) / 500;
        if (progress < 0.3) {
            // 后摇
            this.offsetX = this.isPlayer ? -20 : 20;
        } else if (progress < 0.6) {
            // 前冲
            this.offsetX = this.isPlayer ? 30 : -30;
            this.scale = 1.2;
        } else {
            // 回位
            this.offsetX *= 0.8;
            this.scale = 1 + (1 - progress) * 0.2;
        }
    }
    
    // 防御动画
    updateDefend() {
        this.scale = 0.9;
        this.offsetY = 5;
        // 添加护盾摇摆效果
        this.rotation = Math.sin(this.animationTime * 0.01) * 0.05;
    }
    
    // 受伤动画
    updateHurt() {
        const shake = Math.sin(this.animationTime * 0.05) * 10;
        this.offsetX = shake * (1 - this.animationTime / 1000);
        this.scale = 0.9 + Math.random() * 0.1;
    }
    
    // 蓄力动画
    updateCharge() {
        this.scale = 1 + Math.sin(this.animationTime * 0.01) * 0.1;
        this.rotation = Math.sin(this.animationTime * 0.005) * 0.02;
        
        // 添加能量粒子效果
        if (Math.random() < 0.1) {
            this.effects.push({
                type: 'energy',
                x: (Math.random() - 0.5) * this.width,
                y: (Math.random() - 0.5) * this.height,
                time: 0,
                duration: 1000
            });
        }
    }
    
    // 胜利动画
    updateVictory() {
        const jumpTime = this.animationTime % 500;
        if (jumpTime < 250) {
            this.offsetY = -Math.sin((jumpTime / 250) * Math.PI) * 30;
        }
        this.rotation = Math.sin(this.animationTime * 0.01) * 0.1;
        this.scale = 1.1;
    }
    
    // 失败动画
    updateDefeat() {
        this.scale = 0.8;
        this.offsetY = 20;
        this.rotation = 0.2;
    }
    
    // 绘制角色
    draw(ctx) {
        ctx.save();
        
        // 应用变换
        const actualX = this.x + this.offsetX;
        const actualY = this.y + this.offsetY;
        
        ctx.translate(actualX, actualY);
        ctx.rotate(this.rotation);
        ctx.scale(this.scale, this.scale);
        
        // 绘制阴影
        this.drawShadow(ctx);
        
        // 绘制身体
        this.drawBody(ctx);
        
        // 绘制脸部
        this.drawFace(ctx);
        
        // 绘制特效
        this.drawEffects(ctx);
        
        // 绘制状态效果
        if (this.currentState === 'defend') {
            this.drawShield(ctx);
        }
        
        ctx.restore();
    }
    
    // 绘制阴影
    drawShadow(ctx) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.beginPath();
        ctx.ellipse(0, this.height / 2 + 10, this.width / 3, 10, 0, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // 绘制身体
    drawBody(ctx) {
        // 身体渐变
        const bodyGradient = ctx.createLinearGradient(0, -this.height / 2, 0, this.height / 2);
        bodyGradient.addColorStop(0, this.primaryColor);
        bodyGradient.addColorStop(1, this.secondaryColor);
        
        // 绘制身体圆形
        ctx.fillStyle = bodyGradient;
        ctx.shadowColor = this.primaryColor;
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(0, 0, this.width / 2, 0, Math.PI * 2);
        ctx.fill();
        
        // 绘制手臂
        ctx.strokeStyle = this.primaryColor;
        ctx.lineWidth = 8;
        ctx.lineCap = 'round';
        
        // 左臂
        ctx.beginPath();
        ctx.moveTo(-this.width / 3, 0);
        ctx.lineTo(-this.width / 2 - 10, 10);
        ctx.stroke();
        
        // 右臂
        ctx.beginPath();
        ctx.moveTo(this.width / 3, 0);
        ctx.lineTo(this.width / 2 + 10, 10);
        ctx.stroke();
        
        // 绘制腿
        ctx.beginPath();
        ctx.moveTo(-this.width / 4, this.height / 3);
        ctx.lineTo(-this.width / 4, this.height / 2);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(this.width / 4, this.height / 3);
        ctx.lineTo(this.width / 4, this.height / 2);
        ctx.stroke();
    }
    
    // 绘制脸部
    drawFace(ctx) {
        ctx.shadowBlur = 0;
        
        // 眼睛
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(-this.width / 6, -10, 8, 0, Math.PI * 2);
        ctx.arc(this.width / 6, -10, 8, 0, Math.PI * 2);
        ctx.fill();
        
        // 瞳孔
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(-this.width / 6, -10, 4, 0, Math.PI * 2);
        ctx.arc(this.width / 6, -10, 4, 0, Math.PI * 2);
        ctx.fill();
        
        // 表情
        this.drawExpression(ctx);
    }
    
    // 绘制表情
    drawExpression(ctx) {
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        
        switch(this.expression) {
            case 'happy':
                // 笑脸
                ctx.beginPath();
                ctx.arc(0, 0, this.width / 4, 0.2 * Math.PI, 0.8 * Math.PI);
                ctx.stroke();
                break;
            case 'sad':
                // 哭脸
                ctx.beginPath();
                ctx.arc(0, 15, this.width / 4, 1.2 * Math.PI, 1.8 * Math.PI);
                ctx.stroke();
                break;
            case 'angry':
                // 怒脸
                ctx.strokeStyle = '#FF0000';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(-this.width / 6, -18);
                ctx.lineTo(-this.width / 8, -13);
                ctx.moveTo(this.width / 6, -18);
                ctx.lineTo(this.width / 8, -13);
                ctx.stroke();
                break;
            case 'pain':
                // 痛苦
                ctx.beginPath();
                ctx.moveTo(-this.width / 8, 5);
                ctx.lineTo(this.width / 8, 5);
                ctx.stroke();
                break;
            case 'determined':
                // 坚定
                ctx.beginPath();
                ctx.moveTo(-this.width / 8, 5);
                ctx.lineTo(this.width / 8, 5);
                ctx.stroke();
                ctx.fillStyle = '#FFD700';
                ctx.fillRect(-this.width / 6 - 2, -15, 4, 4);
                ctx.fillRect(this.width / 6 - 2, -15, 4, 4);
                break;
            case 'focused':
                // 专注
                ctx.beginPath();
                ctx.moveTo(-this.width / 10, 5);
                ctx.lineTo(this.width / 10, 5);
                ctx.stroke();
                break;
            default:
                // 普通
                ctx.beginPath();
                ctx.moveTo(-this.width / 8, 5);
                ctx.lineTo(this.width / 8, 5);
                ctx.stroke();
        }
    }
    
    // 绘制护盾
    drawShield(ctx) {
        ctx.strokeStyle = this.isPlayer ? 'rgba(33, 150, 243, 0.6)' : 'rgba(244, 67, 54, 0.6)';
        ctx.lineWidth = 3;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.arc(0, 0, this.width / 2 + 15, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
    }
    
    // 绘制特效
    drawEffects(ctx) {
        this.effects.forEach(effect => {
            const alpha = 1 - effect.time / effect.duration;
            ctx.save();
            ctx.globalAlpha = alpha;
            
            if (effect.type === 'energy') {
                ctx.fillStyle = '#00FFFF';
                ctx.shadowColor = '#00FFFF';
                ctx.shadowBlur = 10;
                ctx.beginPath();
                ctx.arc(effect.x, effect.y, 5, 0, Math.PI * 2);
                ctx.fill();
            }
            
            ctx.restore();
        });
    }
    
    // 添加特效
    addEffect(type) {
        if (type === 'damage') {
            for (let i = 0; i < 5; i++) {
                this.effects.push({
                    type: 'damage',
                    x: (Math.random() - 0.5) * this.width,
                    y: (Math.random() - 0.5) * this.height,
                    time: 0,
                    duration: 500
                });
            }
        }
    }
}