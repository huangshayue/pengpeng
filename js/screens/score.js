import FileManager from '../runtime/fileManager'

Page({
    data: {
        pdfUrl: ''
    },

    async handleOpenPDF(e) {
        try {
            const pdfUrl = e.currentTarget.dataset.url
            if (!pdfUrl) {
                throw new Error('PDF文件路径不能为空')
            }

            await FileManager.openPDF(pdfUrl)
        } catch (error) {
            console.error('打开PDF失败:', error)
            wx.showToast({
                title: '打开文件失败',
                icon: 'none'
            })
        }
    }
}) 