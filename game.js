import Main from './js/runtime/main.js';

console.log('游戏开始初始化');

try {
    // 创建游戏实例
    const main = new Main();
    console.log('游戏实例创建成功');
} catch (error) {
    console.error('游戏实例创建失败:', error);
    wx.showToast({
        title: '游戏启动失败：' + error.message,
        icon: 'none',
        duration: 3000
    });
}

// 添加全局错误处理
wx.onError((error) => {
    console.error('游戏发生错误:', error);
});

// 添加全局未捕获的Promise错误处理
wx.onUnhandledRejection((error) => {
    console.error('未处理的Promise错误:', error);
});

// 创建画布
const canvas = wx.createCanvas();
console.log('Canvas创建成功:', canvas);

// 获取上下文
const ctx = canvas.getContext('2d');
console.log('Canvas上下文获取成功:', ctx);

// 设置画布尺寸
const canvasWidth = canvas.width;
const canvasHeight = canvas.height;
console.log('画布尺寸:', canvasWidth, canvasHeight);

// 设置背景色
ctx.fillStyle = '#f0f0f0';
ctx.fillRect(0, 0, canvasWidth, canvasHeight);
console.log('背景绘制完成');

// 绘制文字
ctx.fillStyle = '#000000';
ctx.font = '20px Arial';
ctx.fillText('游戏测试', 100, 100);
console.log('文字绘制完成');

// 绘制一个矩形
ctx.fillStyle = '#ff0000';
ctx.fillRect(50, 50, 100, 100);
console.log('矩形绘制完成');

// 添加触摸事件监听
wx.onTouchStart((e) => {
    console.log('触摸开始:', e);
});

wx.onTouchMove((e) => {
    console.log('触摸移动:', e);
});

wx.onTouchEnd((e) => {
    console.log('触摸结束:', e);
});

console.log('游戏初始化完成');
