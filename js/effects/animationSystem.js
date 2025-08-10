// 动画系统
export class AnimationSystem {
    constructor() {
        this.animations = [];
    }

    // 添加动画
    addAnimation(animation) {
        this.animations.push(animation);
    }

    // 创建数字飘动动画
    createDamageNumber(x, y, damage, color = '#FF0000') {
        this.addAnimation(new DamageNumber(x, y, damage, color));
    }

    // 创建震动效果
    createShake(intensity = 5, duration = 300) {
        this.addAnimation(new ShakeEffect(intensity, duration));
    }

    // 创建闪光效果
    createFlash(color = '#FFFFFF', duration = 200) {
        this.addAnimation(new FlashEffect(color, duration));
    }

    update(deltaTime) {
        this.animations = this.animations.filter(animation => {
            animation.update(deltaTime);
            return !animation.isFinished();
        });
    }

    draw(ctx, width, height) {
        this.animations.forEach(animation => {
            if (animation.draw) {
                animation.draw(ctx, width, height);
            }
        });
    }

    getShakeOffset() {
        const shakeEffect = this.animations.find(a => a instanceof ShakeEffect);
        return shakeEffect ? shakeEffect.getOffset() : { x: 0, y: 0 };
    }

    clear() {
        this.animations = [];
    }
}

// 伤害数字动画
class DamageNumber {
    constructor(x, y, damage, color) {
        this.x = x;
        this.y = y;
        this.damage = damage;
        this.color = color;
        this.vy = -3;
        this.alpha = 1;
        this.scale = 1;
        this.time = 0;
        this.duration = 1000;
    }

    update(deltaTime) {
        this.time += deltaTime;
        this.y += this.vy;
        this.vy += 0.15;
        this.alpha = Math.max(0, 1 - this.time / this.duration);
        this.scale = 1 + (this.time / this.duration) * 0.5;
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        ctx.font = `bold ${24 * this.scale}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 4;
        ctx.fillText(`-${this.damage}`, this.x, this.y);
        ctx.restore();
    }

    isFinished() {
        return this.alpha <= 0;
    }
}

// 震动效果
class ShakeEffect {
    constructor(intensity, duration) {
        this.intensity = intensity;
        this.duration = duration;
        this.time = 0;
        this.offsetX = 0;
        this.offsetY = 0;
    }

    update(deltaTime) {
        this.time += deltaTime;
        const progress = this.time / this.duration;
        const currentIntensity = this.intensity * (1 - progress);
        this.offsetX = (Math.random() - 0.5) * currentIntensity * 2;
        this.offsetY = (Math.random() - 0.5) * currentIntensity * 2;
    }

    getOffset() {
        return { x: this.offsetX, y: this.offsetY };
    }

    isFinished() {
        return this.time >= this.duration;
    }
}

// 闪光效果
class FlashEffect {
    constructor(color, duration) {
        this.color = color;
        this.duration = duration;
        this.time = 0;
        this.alpha = 0;
    }

    update(deltaTime) {
        this.time += deltaTime;
        const progress = this.time / this.duration;
        if (progress < 0.5) {
            this.alpha = progress * 2;
        } else {
            this.alpha = (1 - progress) * 2;
        }
    }

    draw(ctx, width, height) {
        if (this.alpha > 0) {
            ctx.save();
            ctx.globalAlpha = this.alpha * 0.3;
            ctx.fillStyle = this.color;
            ctx.fillRect(0, 0, width, height);
            ctx.restore();
        }
    }

    isFinished() {
        return this.time >= this.duration;
    }
}

// 缓动函数
export class Easing {
    static easeInOut(t) {
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    }

    static easeOut(t) {
        return t * (2 - t);
    }

    static easeIn(t) {
        return t * t;
    }

    static elastic(t) {
        return Math.sin(-13 * (t + 1) * Math.PI / 2) * Math.pow(2, -10 * t) + 1;
    }

    static bounce(t) {
        if (t < 0.363636) {
            return 7.5625 * t * t;
        } else if (t < 0.727272) {
            t -= 0.545454;
            return 7.5625 * t * t + 0.75;
        } else if (t < 0.909090) {
            t -= 0.818181;
            return 7.5625 * t * t + 0.9375;
        } else {
            t -= 0.954545;
            return 7.5625 * t * t + 0.984375;
        }
    }
}