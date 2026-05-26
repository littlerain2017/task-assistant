const API = 'https://browsing-trio-seldom.ngrok-free.dev'
const TEMPLATE_ID = 'wnPOFUCqyZgTiMY7pdHoNgyG65k3VBC38JXLuOfXdZw'

Page({
  data: {
    tasks: [],
    inputValue: '',
    openid: ''
  },

  onLoad() {
    const dateKey = new Date().toISOString().slice(0, 10)
    const saved = wx.getStorageSync(`tasks_${dateKey}`) || []
    if (saved.length > 0) {
      this.setData({ tasks: saved.map(t => t.name) })
    }
    this.getOpenid()
  },

  getOpenid() {
    const cached = wx.getStorageSync('openid')
    if (cached) { this.setData({ openid: cached }); return }
    wx.login({
      success: (res) => {
        wx.request({
          url: `${API}/login`,
          method: 'POST',
          data: { code: res.code },
          success: (r) => {
            if (r.data.openid) {
              this.setData({ openid: r.data.openid })
              wx.setStorageSync('openid', r.data.openid)
            }
          }
        })
      }
    })
  },

  onInput(e) {
    this.setData({ inputValue: e.detail.value })
  },

  addTask() {
    const val = this.data.inputValue.trim()
    if (!val) return
    this.setData({
      tasks: [...this.data.tasks, val],
      inputValue: ''
    })
  },

  removeTask(e) {
    const index = e.currentTarget.dataset.index
    const tasks = [...this.data.tasks]
    tasks.splice(index, 1)
    this.setData({ tasks })
  },

  sendToBackend(openid) {
    wx.request({
      url: `${API}/submit-tasks`,
      method: 'POST',
      header: { 'content-type': 'application/json' },
      data: { openid, tasks: this.data.tasks },
      success: () => console.log('任务发送成功'),
      fail: (e) => console.log('发送失败', JSON.stringify(e))
    })
  },

  submitTasks() {
    if (this.data.tasks.length === 0) return
    const dateKey = new Date().toISOString().slice(0, 10)
    const taskObjects = this.data.tasks.map(name => ({ name, status: '未开始' }))
    wx.setStorageSync(`tasks_${dateKey}`, taskObjects)

    wx.requestSubscribeMessage({
      tmplIds: [TEMPLATE_ID],
      success: () => {
        const openid = this.data.openid || wx.getStorageSync('openid')
        if (openid) {
          this.sendToBackend(openid)
        } else {
          wx.login({
            success: (res) => {
              wx.request({
                url: `${API}/login`,
                method: 'POST',
                header: { 'content-type': 'application/json' },
                data: { code: res.code },
                success: (r) => {
                  if (r.data.openid) {
                    wx.setStorageSync('openid', r.data.openid)
                    this.sendToBackend(r.data.openid)
                  }
                }
              })
            }
          })
        }
      }
    })

    wx.showToast({ title: '任务已保存，3小时后提醒', icon: 'success' })
    setTimeout(() => wx.navigateBack(), 1500)
  }
})
