Page({
  data: {
    tasks: []
  },

  onShow() {
    const dateKey = new Date().toISOString().slice(0, 10)
    const tasks = wx.getStorageSync(`tasks_${dateKey}`) || []
    this.setData({ tasks })
  },

  setStatus(e) {
    const { index, status } = e.currentTarget.dataset
    const tasks = [...this.data.tasks]
    tasks[index].status = status
    this.setData({ tasks })
  },

  submitProgress() {
    const dateKey = new Date().toISOString().slice(0, 10)
    wx.setStorageSync(`tasks_${dateKey}`, this.data.tasks)

    wx.showToast({ title: '进度已更新', icon: 'success' })
    setTimeout(() => wx.navigateBack(), 1500)
  }
})
