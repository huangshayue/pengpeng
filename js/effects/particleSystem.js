// 粒子系统
export class Particle {
    constructor(x, y, options = {}) {
        this.x = x;
        this.y = y;
        this.vx = options.vx || (Math.random() - 0.5) * 2;
        this.vy = options.vy || (Math.random() - 0.5) * 2;
        this.radius = options.radius || Math.random() * 3 + 1;
        this.color = options.color || '#FFD700';
        this.life = options.life || 1;
        this.decay = options.decay || 0.02;
        this.gravity = options.gravity || 0;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += this.gravity;
        this.life -= this.decay;
        this.radius *= 0.98;
    }

    draw(ctx) {
        if (this.life <= 0) return;
        
        ctx.save();
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    isDead() {
        return this.life <= 0 || this.radius <= 0.1;
    }
}

export class ParticleSystem {
    constructor() {
        this.particles = [];
    }

    // 创建爆炸效果
    createExplosion(x, y, color = '#FF6B6B', count = 20) {
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 * i) / count;
            const speed = Math.random() * 3 + 2;
            this.particles.push(new Particle(x, y, {
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                color: color,
                radius: Math.random() * 4 + 2,
                life: 1,
                decay: 0.02
            }));
        }
    }

    // 创建治疗效果
    createHeal(x, y, count = 15) {
        for (let i = 0; i < count; i++) {
            this.particles.push(new Particle(x, y, {
                vx: (Math.random() - 0.5) * 1,
                vy: -Math.random() * 2 - 1,
                color: '#4CAF50',
                radius: Math.random() * 3 + 1,
                life: 1,
                decay: 0.015,
                gravity: -0.05
            }));
        }
    }

    // 创建能量收集效果
    createEnergyGather(x, y, count = 10) {
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 * i) / count;
            const distance = 50;
            this.particles.push(new Particle(
                x + Math.cos(angle) * distance,
                y + Math.sin(angle) * distance,
                {
                    vx: -Math.cos(angle) * 2,
                    vy: -Math.sin(angle) * 2,
                    color: '#2196F3',
                    radius: Math.random() * 2 + 1,
                    life: 1,
                    decay: 0.02
                }
            ));
        }
    }

    // 创建防御护盾效果
    createShield(x, y, radius = 60) {
        const count = 30;
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 * i) / count;
            this.particles.push(new Particle(
                x + Math.cos(angle) * radius,
                y + Math.sin(angle) * radius,
                {
                    vx: Math.cos(angle) * 0.5,
                    vy: Math.sin(angle) * 0.5,
                    color: '#9C27B0',
                    radius: 2,
                    life: 0.8,
                    decay: 0.01
                }
            ));
        }
    }

    update() {
        this.particles = this.particles.filter(particle => {
            particle.update();
            return !particle.isDead();
        });
    }

    draw(ctx) {
        this.particles.forEach(particle => particle.draw(ctx));
    }

    clear() {
        this.particles = [];
    }
}