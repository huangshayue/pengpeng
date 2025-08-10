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
        
        // 一指攻击：基础伤害10，但被普挡完全防御
        let damage = 10;
        if (defender.isDefending) {
            if (defender.defenseType === 'normal') {
                // 普挡防御值5，完全抵消一指的10点伤害
                damage = Math.max(0, damage - 5);
                console.log('普挡防御，一指攻击被完全抵消');
            } else if (defender.defenseType === 'blood') {
                // 血挡无限防御
                damage = 0;
                console.log('血挡完全防御一指攻击');
            }
        }
        
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
        
        // 发波攻击：基础伤害50，可以破普挡
        let damage = 50;
        if (defender.isDefending) {
            if (defender.defenseType === 'normal') {
                // 普挡只能减少5点伤害，发波可以破防
                damage = damage - 5;
                console.log('发波攻击破解普挡，造成', damage, '点伤害');
            } else if (defender.defenseType === 'blood') {
                // 血挡依然可以完全防御发波
                damage = 0;
                console.log('血挡完全防御发波攻击');
            }
        }
        
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
        
        // 磨磨攻击：基础伤害20
        let damage = 20;
        
        if (defender.isDefending) {
            if (defender.defenseType === 'blood') {
                // 磨磨直接破血挡，造成100%伤害
                defender.isDefending = false;
                defender.defenseType = null;
                damage = 100; // 直接击破，造成100点伤害
                console.log('磨磨破除血挡！造成100点伤害！');
            } else if (defender.defenseType === 'normal') {
                // 普挡可以防御磨磨
                damage = Math.max(0, damage - 5);
                console.log('普挡防御磨磨，减少5点伤害');
            }
        }
        
        defender.health = Math.max(0, defender.health - damage);
        console.log('磨磨攻击造成伤害:', damage);
        return true;
    }

    // 计算实际伤害（已废弃，直接在各攻击方法中处理）
    calculateDamage(baseDamage, defender) {
        return baseDamage;
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