class Input {
    constructor(options) {
        this.placeholder = options.placeholder || '';
        this.x = options.x || 0;
        this.y = options.y || 0;
        this.width = options.width || 200;
        this.height = options.height || 40;
        this.value = options.value || '';
        this.visible = options.visible !== undefined ? options.visible : true;
        this.enabled = options.enabled !== undefined ? options.enabled : true;
        this.backgroundColor = options.backgroundColor || '#FFFFFF';
        this.textColor = options.textColor || '#000000';
        this.borderColor = options.borderColor || '#CCCCCC';
        this.isFocused = false;
    }

    render() {
        if (!this.visible) return;

        const ctx = canvas.getContext('2d');
        
        // 绘制输入框背景
        ctx.fillStyle = this.backgroundColor;
        ctx.strokeStyle = this.isFocused ? '#4CAF50' : this.borderColor;
        ctx.lineWidth = 2;
        ctx.fillRect(this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);
        ctx.strokeRect(this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);
        
        // 绘制输入框文字
        ctx.fillStyle = this.textColor;
        ctx.font = '16px Arial';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        
        const text = this.value || this.placeholder;
        const textColor = this.value ? this.textColor : '#999999';
        ctx.fillStyle = textColor;
        ctx.fillText(text, this.x - this.width / 2 + 10, this.y);
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
            this.isFocused = true;
            // 这里可以添加键盘输入处理
        } else {
            this.isFocused = false;
        }
        
        return isClicked;
    }

    setValue(value) {
        this.value = value;
    }

    getValue() {
        return this.value;
    }
}

module.exports = Input; 