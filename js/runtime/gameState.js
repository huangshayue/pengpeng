// 定义游戏中的动作类型
export const ActionType = {
    // 积气
    ACCUMULATE: 'accumulate',
    
    // 防御
    NORMAL_DEFENSE: 'normalDefense', // 普挡
    BLOOD_DEFENSE: 'bloodDefense',   // 血挡
    
    // 攻击
    FINGER_ATTACK: 'fingerAttack',   // 一指
    WAVE_ATTACK: 'waveAttack',       // 发波
    GRIND_ATTACK: 'grindAttack'      // 磨磨
};

// 游戏状态管理类
export default class GameState {
    constructor() {
        this.reset();
    }

    // 重置游戏状态
    reset() {
        // 玩家1状态
        this.player1 = {
            health: 100,      // 生命值
            qi: 0,           // 气值
            isDefending: false, // 是否在防御
            defenseType: null   // 防御类型
        };

        // 玩家2状态
        this.player2 = {
            health: 100,
            qi: 0,
            isDefending: false,
            defenseType: null
        };
    }

    // 处理玩家动作
    handleAction(playerNumber, actionType) {
        const player = playerNumber === 1 ? this.player1 : this.player2;
        const opponent = playerNumber === 1 ? this.player2 : this.player1;

        switch (actionType) {
            case ActionType.ACCUMULATE:
                return this.handleAccumulate(player);
            
            case ActionType.NORMAL_DEFENSE:
                return this.handleNormalDefense(player);
            
            case ActionType.BLOOD_DEFENSE:
                return this.handleBloodDefense(player);
            
            case ActionType.FINGER_ATTACK:
                return this.handleFingerAttack(player, opponent);
            
            case ActionType.WAVE_ATTACK:
                return this.handleWaveAttack(player, opponent);
            
            case ActionType.GRIND_ATTACK:
                return this.handleGrindAttack(player, opponent);
            
            default:
                console.error('未知的动作类型:', actionType);
                return false;
        }
    }

    // 处理积气
    handleAccumulate(player) {
        player.qi += 1;
        console.log('积气成功，当前气值:', player.qi);
        return true;
    }

    // 处理普挡
    handleNormalDefense(player) {
        player.isDefending = true;
        player.defenseType = 'normal';
        console.log('普挡防御已开启');
        return true;
    }

    // 处理血挡
    handleBloodDefense(player) {
        player.isDefending = true;
        player.defenseType = 'blood';
        console.log('血挡防御已开启');
        return true;
    }

    // 处理一指攻击
    handleFingerAttack(attacker, defender) {
        if (attacker.qi < 1) {
            console.log('气不足，无法使用一指');
            return false;
        }

        attacker.qi -= 1;
        const damage = this.calculateDamage(10, defender);
        defender.health = Math.max(0, defender.health - damage);
        
        console.log('一指攻击造成伤害:', damage);
        return true;
    }

    // 处理发波攻击
    handleWaveAttack(attacker, defender) {
        if (attacker.qi < 5) {
            console.log('气不足，无法使用发波');
            return false;
        }

        attacker.qi -= 5;
        const damage = this.calculateDamage(50, defender);
        defender.health = Math.max(0, defender.health - damage);
        
        console.log('发波攻击造成伤害:', damage);
        return true;
    }

    // 处理磨磨攻击
    handleGrindAttack(attacker, defender) {
        if (attacker.qi < 2) {
            console.log('气不足，无法使用磨磨');
            return false;
        }

        attacker.qi -= 2;
        
        // 磨磨可以破除血挡
        if (defender.isDefending && defender.defenseType === 'blood') {
            defender.isDefending = false;
            defender.defenseType = null;
            console.log('磨磨破除了血挡');
        }
        
        const damage = this.calculateDamage(20, defender);
        defender.health = Math.max(0, defender.health - damage);
        
        console.log('磨磨攻击造成伤害:', damage);
        return true;
    }

    // 计算实际伤害
    calculateDamage(baseDamage, defender) {
        if (!defender.isDefending) {
            return baseDamage;
        }

        switch (defender.defenseType) {
            case 'normal':
                // 普挡减少50%伤害
                return Math.floor(baseDamage * 0.5);
            case 'blood':
                // 血挡完全防御，但扣除5点生命值作为代价
                defender.health = Math.max(0, defender.health - 5);
                console.log('血挡消耗5点生命值');
                return 0;
            default:
                return baseDamage;
        }
    }

    // 检查游戏是否结束
    checkGameOver() {
        if (this.player1.health <= 0) {
            return 2; // 玩家2获胜
        }
        if (this.player2.health <= 0) {
            return 1; // 玩家1获胜
        }
        return 0; // 游戏继续
    }
} 