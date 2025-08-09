class Button {
    constructor(options) {
        this.text = options.text || '';
        this.x = options.x || 0;
        this.y = options.y || 0;
        this.width = options.width || 100;
        this.height = options.height || 40;
        this.onClick = options.onClick || (() => {});
        this.visible = options.visible !== undefined ? options.visible : true;
        this.enabled = options.enabled !== undefined ? options.enabled : true;
        this.backgroundColor = options.backgroundColor || '#4CAF50';
        this.textColor = options.textColor || '#FFFFFF';
    }

    render() {
        if (!this.visible) return;

        const ctx = canvas.getContext('2d');
        
        // 绘制按钮背景
        ctx.fillStyle = this.enabled ? this.backgroundColor : '#CCCCCC';
        ctx.fillRect(this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);
        
        // 绘制按钮文字
        ctx.fillStyle = this.textColor;
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.text, this.x, this.y);
    }

    handleClick(x, y) {
        if (!this.visible || !this.enabled) return false;
        
        const isClicked = (
            x >= this.x - this.width / 2 &&
            x <= this.x + this.width / 2 &&
            y >= this.y - this.height / 2 &&
            y <= this.y + this.height / 2
        );
        
        if (isClicked) {
            this.onClick();
        }
        
        return isClicked;
    }
}

module.exports = Button; 