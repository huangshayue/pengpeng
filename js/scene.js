import { Game } from './game';

class GameScene {
    constructor() {
        this.game = new Game();
        this.init();
    }

    init() {
        // 初始化游戏状态
        this.updateUI();
    }

    // 更新UI显示
    updateUI() {
        const currentPlayer = this.game.getCurrentPlayer();
        const opponent = this.game.getOpponent();

        // 更新玩家状态显示
        this.updatePlayerStatus(1, this.game.player1);
        this.updatePlayerStatus(2, this.game.player2);

        // 更新当前玩家提示
        this.updateCurrentPlayerIndicator();
    }

    // 更新玩家状态显示
    updatePlayerStatus(playerNumber, player) {
        // 这里需要实现具体的UI更新逻辑
        console.log(`玩家${playerNumber}状态：`);
        console.log(`生命值：${player.health}`);
        console.log(`气值：${player.qi}`);
        console.log(`防御状态：${player.isDefending ? player.defenseType : '无'}`);
    }

    // 更新当前玩家指示器
    updateCurrentPlayerIndicator() {
        console.log(`当前是玩家${this.game.currentPlayer}的回合`);
    }

    // 处理玩家操作
    handlePlayerAction(action) {
        const currentPlayer = this.game.getCurrentPlayer();
        const opponent = this.game.getOpponent();

        switch (action) {
            case 'accumulate':
                currentPlayer.accumulateQi();
                break;
            case 'normalDefense':
                currentPlayer.normalDefense();
                break;
            case 'bloodDefense':
                currentPlayer.bloodDefense();
                break;
            case 'fingerAttack':
                if (!currentPlayer.fingerAttack(opponent)) {
                    console.log('气值不足，无法使用一指攻击');
                    return;
                }
                break;
            case 'waveAttack':
                if (!currentPlayer.waveAttack(opponent)) {
                    console.log('气值不足，无法使用发波攻击');
                    return;
                }
                break;
            case 'grindAttack':
                if (!currentPlayer.grindAttack(opponent)) {
                    console.log('气值不足，无法使用磨磨攻击');
                    return;
                }
                break;
            default:
                console.log('无效的操作');
                return;
        }

        // 检查游戏是否结束
        if (opponent.health <= 0) {
            console.log(`游戏结束！玩家${this.game.currentPlayer}获胜！`);
            return;
        }

        // 切换玩家
        this.game.switchPlayer();
        this.updateUI();
    }
}

export default GameScene; 