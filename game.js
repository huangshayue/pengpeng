import Main from './js/runtime/main.js';

console.log('游戏开始初始化');

// 初始化云开发
if (wx.cloud) {
  wx.cloud.init({
    env: 'cloud1-2ghmqnl5aabc85cc', // 你的云环境ID
    traceUser: true
  });
  console.log('云开发初始化成功');
} else {
  console.log('云开发不可用，将使用本地模式');
}

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