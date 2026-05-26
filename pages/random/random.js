const API = 'https://web-production-e223e.up.railway.app'
const TEMPLATE_ID = 'wnPOFUCqyZgTiMY7pdHoNgyG65k3VBC38JXLuOfXdZw'
const HEADERS = { 'content-type': 'application/json' }

Page({
  data: {
    goals: [],
    inputValue: '',
    loading: false,
    result: null,
    openid: ''
  },

  onLoad() {
    const cached = wx.getStorageSync('openid')
    if (cached) this.setData({ openid: cached })
  },

  onInput(e) {
    this.setData({ inputValue: e.detail.value })
  },

  addGoal() {
    const val = this.data.inputValue.trim()
    if (!val) return
    this.setData({ goals: [...this.data.goals, val], inputValue: '' })
  },

  removeGoal(e) {
    const goals = [...this.data.goals]
    goals.splice(e.currentTarget.dataset.index, 1)
    this.setData({ goals })
  },

  randomStart() {
    if (this.data.goals.length === 0) return
    wx.requestSubscribeMessage({
      tmplIds: [TEMPLATE_ID],
      success: () => this.callApi(),
      fail: () => this.callApi()
    })
  },

  callApi() {
    this.setData({ loading: true })
    const openid = this.data.openid || wx.getStorageSync('openid') || 'anonymous'
    wx.request({
      url: `${API}/random-start`,
      method: 'POST',
      header: HEADERS,
      data: { openid, goals: this.data.goals },
      success: (r) => {
        this.setData({ result: r.data, loading: false })
      },
      fail: () => {
        this.setData({ loading: false })
        wx.showToast({ title: '网络错误，请重试', icon: 'error' })
      }
    })
  },

  reroll() {
    this.setData({ result: null })
    this.callApi()
  },

  goStart() {
    wx.showToast({ title: '加油！30分钟后见', icon: 'success' })
    setTimeout(() => wx.navigateBack(), 1500)
  }
})
