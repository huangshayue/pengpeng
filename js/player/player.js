// 玩家类
export default class Player {
    constructor(x, y) {
        // 玩家位置
        this.x = x;
        this.y = y;
        
        // 玩家大小
        this.width = 50;
        this.height = 50;
        
        // 玩家属性
        this.health = 100;  // 生命值
        this.speed = 5;     // 移动速度
        
        // 玩家状态
        this.isMoving = false;
        this.direction = 'right'; // 朝向：left或right
    }

    // 绘制玩家
    render(ctx) {
        ctx.save();
        
        // 绘制玩家主体（蓝色方块）
        ctx.fillStyle = '#0000FF';
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // 绘制朝向标识（白色三角形）
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        if (this.direction === 'right') {
            ctx.moveTo(this.x + this.width, this.y + this.height / 2);
            ctx.lineTo(this.x + this.width - 10, this.y + this.height / 2 - 10);
            ctx.lineTo(this.x + this.width - 10, this.y + this.height / 2 + 10);
        } else {
            ctx.moveTo(this.x, this.y + this.height / 2);
            ctx.lineTo(this.x + 10, this.y + this.height / 2 - 10);
            ctx.lineTo(this.x + 10, this.y + this.height / 2 + 10);
        }
        ctx.closePath();
        ctx.fill();
        
        // 绘制生命值条
        const healthBarWidth = this.width;
        const healthBarHeight = 5;
        // 背景（灰色）
        ctx.fillStyle = '#666666';
        ctx.fillRect(
            this.x,
            this.y - 10,
            healthBarWidth,
            healthBarHeight
        );
        // 血量（红色）
        ctx.fillStyle = '#FF0000';
        ctx.fillRect(
            this.x,
            this.y - 10,
            healthBarWidth * (this.health / 100),
            healthBarHeight
        );
        
        ctx.restore();
    }

    // 更新玩家状态
    update() {
        // 后续添加更新逻辑
    }

    // 移动方法
    moveLeft() {
        this.direction = 'left';
        this.x -= this.speed;
    }

    moveRight() {
        this.direction = 'right';
        this.x += this.speed;
    }

    moveUp() {
        this.y -= this.speed;
    }

    moveDown() {
        this.y += this.speed;
    }

    // 受伤方法
    takeDamage(amount) {
        this.health = Math.max(0, this.health - amount);
        console.log('Player took damage:', amount, 'Current health:', this.health);
    }

    // 治疗方法
    heal(amount) {
        this.health = Math.min(100, this.health + amount);
        console.log('Player healed:', amount, 'Current health:', this.health);
    }
} 