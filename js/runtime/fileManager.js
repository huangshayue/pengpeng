export default class FileManager {
    static async openPDF(filePath) {
        try {
            // 先下载文件到本地临时目录
            const downloadResult = await wx.downloadFile({
                url: filePath,
                success: function (res) {
                    console.log('文件下载成功:', res)
                },
                fail: function (error) {
                    console.error('文件下载失败:', error)
                    throw error
                }
            })

            if (downloadResult.statusCode !== 200) {
                throw new Error('文件下载失败')
            }

            // 打开文件
            await wx.openDocument({
                filePath: downloadResult.tempFilePath,
                fileType: 'pdf',
                showMenu: true,
                success: function (res) {
                    console.log('打开文档成功')
                },
                fail: function (error) {
                    console.error('打开文档失败:', error)
                    throw error
                }
            })
        } catch (error) {
            console.error('处理PDF文件失败:', error)
            wx.showModal({
                title: '打开文件失败',
                content: error.message || '无法打开PDF文件',
                showCancel: false
            })
            throw error
        }
    }
} 