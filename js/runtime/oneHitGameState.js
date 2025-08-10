// 一击必杀游戏状态管理
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
export default class OneHitGameState {
    constructor() {
        this.reset();
    }

    // 重置游戏状态
    reset() {
        // 玩家1状态
        this.player1 = {
            isAlive: true,           // 是否存活
            qi: 0,                   // 气值
            isDefending: false,      // 是否在防御
            defenseType: null,       // 防御类型
            defenseValue: 0,         // 防御力
            defenseBroken: false     // 防御是否被破
        };

        // 玩家2状态
        this.player2 = {
            isAlive: true,
            qi: 0,
            isDefending: false,
            defenseType: null,
            defenseValue: 0,
            defenseBroken: false
        };
    }

    // 获取动作的攻击力
    getAttackPower(action) {
        switch (action) {
            case ActionType.FINGER_ATTACK:
                return 1;  // 一指攻击力1
            case ActionType.WAVE_ATTACK:
                return 10; // 发波攻击力10
            case ActionType.GRIND_ATTACK:
                return 1;  // 磨磨攻击力1（但破血挡）
            default:
                return 0;
        }
    }

    // 获取动作的气消耗
    getQiCost(action) {
        switch (action) {
            case ActionType.FINGER_ATTACK:
                return 1;  // 一指消耗1气
            case ActionType.WAVE_ATTACK:
                return 5;  // 发波消耗5气
            case ActionType.GRIND_ATTACK:
                return 2;  // 磨磨消耗2气
            default:
                return 0;
        }
    }

    // 处理玩家动作
    handleAction(playerNumber, actionType) {
        const player = playerNumber === 1 ? this.player1 : this.player2;
        const opponent = playerNumber === 1 ? this.player2 : this.player1;

        // 如果玩家已死亡，不能行动
        if (!player.isAlive) {
            console.log('玩家已死亡，无法行动');
            return false;
        }

        // 如果防御被破，不能再防御
        if (player.defenseBroken && (actionType === ActionType.NORMAL_DEFENSE || actionType === ActionType.BLOOD_DEFENSE)) {
            console.log('防御已被破坏，无法再防御');
            return false;
        }

        switch (actionType) {
            case ActionType.ACCUMULATE:
                return this.handleAccumulate(player);
            
            case ActionType.NORMAL_DEFENSE:
                return this.handleNormalDefense(player);
            
            case ActionType.BLOOD_DEFENSE:
                return this.handleBloodDefense(player);
            
            case ActionType.FINGER_ATTACK:
            case ActionType.WAVE_ATTACK:
            case ActionType.GRIND_ATTACK:
                return this.handleAttack(player, opponent, actionType);
            
            default:
                console.error('未知的动作类型:', actionType);
                return false;
        }
    }

    // 处理积气
    handleAccumulate(player) {
        // 积气时解除防御
        player.isDefending = false;
        player.defenseType = null;
        player.defenseValue = 0;
        
        player.qi += 1;
        console.log('积气成功，当前气值:', player.qi);
        return true;
    }

    // 处理普挡
    handleNormalDefense(player) {
        if (player.defenseBroken) {
            console.log('防御已破损，无法使用普挡');
            return false;
        }
        
        // 解除之前的防御，设置新防御
        player.isDefending = true;
        player.defenseType = 'normal';
        player.defenseValue = 5; // 普挡防御力5
        console.log('普挡防御已开启，防御力:', player.defenseValue);
        return true;
    }

    // 处理血挡
    handleBloodDefense(player) {
        if (player.defenseBroken) {
            console.log('防御已破损，无法使用血挡');
            return false;
        }
        
        // 血挡不需要消耗气
        player.isDefending = true;
        player.defenseType = 'blood';
        player.defenseValue = 999999; // 血挡防御力无穷
        console.log('血挡防御已开启，防御力:无穷');
        return true;
    }

    // 处理攻击
    handleAttack(attacker, defender, attackType) {
        const qiCost = this.getQiCost(attackType);
        
        // 检查气是否足够
        if (attacker.qi < qiCost) {
            console.log('气不足，无法使用', attackType);
            return false;
        }

        // 消耗气
        attacker.qi -= qiCost;
        
        // 攻击时解除自己的防御
        attacker.isDefending = false;
        attacker.defenseType = null;
        attacker.defenseValue = 0;

        // 获取攻击力
        const attackPower = this.getAttackPower(attackType);
        console.log(`${attackType} 攻击，攻击力:${attackPower}`);

        // 判定结果
        let result = this.resolveAttack(attackPower, defender, attackType);
        
        return result;
    }

    // 解决攻击判定
    resolveAttack(attackPower, defender, attackType) {
        // 特殊情况：磨磨vs血挡
        if (attackType === ActionType.GRIND_ATTACK && defender.isDefending && defender.defenseType === 'blood') {
            console.log('磨磨破血挡！防御方直接失败！');
            defender.isAlive = false;
            return true;
        }

        // 如果对方没有防御
        if (!defender.isDefending) {
            console.log('对方没有防御，直接击败！');
            defender.isAlive = false;
            return true;
        }

        // 比较攻击力和防御力
        if (attackPower > defender.defenseValue) {
            // 攻击大于防御，防御方失败
            console.log(`攻击力(${attackPower}) > 防御力(${defender.defenseValue})，防御方失败！`);
            defender.isAlive = false;
            return true;
        } else if (attackPower === defender.defenseValue) {
            // 攻击等于防御，防御被破
            console.log(`攻击力(${attackPower}) = 防御力(${defender.defenseValue})，防御被破！`);
            defender.isDefending = false;
            defender.defenseType = null;
            defender.defenseValue = 0;
            defender.defenseBroken = true; // 标记防御已破损
            return true;
        } else {
            // 攻击小于防御，攻击无效
            console.log(`攻击力(${attackPower}) < 防御力(${defender.defenseValue})，攻击无效`);
            return true;
        }
    }

    // 检查游戏是否结束
    checkGameOver() {
        if (!this.player1.isAlive) {
            return 2; // 玩家2获胜
        }
        if (!this.player2.isAlive) {
            return 1; // 玩家1获胜
        }
        return 0; // 游戏继续
    }

    // 获取游戏状态摘要
    getStatusSummary(playerNumber) {
        const player = playerNumber === 1 ? this.player1 : this.player2;
        let status = [];
        
        if (!player.isAlive) {
            status.push('已失败');
        } else {
            status.push(`气:${player.qi}`);
            
            if (player.isDefending) {
                if (player.defenseType === 'blood') {
                    status.push('血挡中');
                } else {
                    status.push(`普挡(${player.defenseValue})`);
                }
            }
            
            if (player.defenseBroken) {
                status.push('防御已破');
            }
        }
        
        return status.join(' ');
    }
}