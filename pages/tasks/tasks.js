const API = 'https://web-production-e223e.up.railway.app'
const TEMPLATE_ID = 'wnPOFUCqyZgTiMY7pdHoNgyG65k3VBC38JXLuOfXdZw'
const HEADERS = { 'content-type': 'application/json', 'ngrok-skip-browser-warning': 'true' }

const REMIND_OPTIONS = [
  { value: 1/6,  label: '10分钟', color: '#a78bfa' },
  { value: 0.5,  label: '30分钟', color: '#60a5fa' },
  { value: 1,    label: '1小时',  color: '#34d399' },
  { value: 3,    label: '3小时',  color: '#fb923c' },
]

const REMIND_LABELS = {
  '10min': '10分钟',
  '30min': '30分钟',
  '1hr':   '1小时',
  '3hr':   '3小时',
}

function hoursToKey(h) {
  if (h <= 1/6) return '10min'
  if (h <= 0.5) return '30min'
  if (h <= 1)   return '1hr'
  return '3hr'
}

function loadAllTasks() {
  return wx.getStorageSync('all_tasks') || []
}

function saveAllTasks(tasks) {
  wx.setStorageSync('all_tasks', tasks)
}

function loadDraftTasks() {
  return wx.getStorageSync('draft_tasks') || []
}

function saveDraftTasks(tasks) {
  wx.setStorageSync('draft_tasks', tasks)
}

function commitToHistory(tasks, remindHours) {
  const all = loadAllTasks()
  const date = new Date().toISOString().slice(0, 10)
  const toAdd = tasks.map(t => ({
    id: Date.now() + Math.random(),
    name: t.name,
    remind: t.remind || hoursToKey(remindHours),
    progress: 0,
    date
  }))
  saveAllTasks([...all, ...toAdd])
  saveDraftTasks([])
}

Page({
  data: {
    mode: '',
    newTasks: [],
    history: [],
    inputValue: '',
    openid: '',
    remindHours: 3,
    remindOptions: REMIND_OPTIONS,
    remindLabels: REMIND_LABELS,
    showHistory: false,
    breakdown: null,
    loadingBreakdown: false,
  },

  onLoad(options) {
    this.setData({ mode: options.mode || '' })
    if (options.mode === 'focus') {
      wx.setNavigationBarTitle({ title: 'Focus 模式' })
    }
  },

  onShow() {
    const all = loadAllTasks()
    const drafts = loadDraftTasks()
    this.setData({
      history: all.slice().reverse(),
      newTasks: drafts,
    })
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
          header: HEADERS,
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
    const remindKey = hoursToKey(this.data.remindHours)
    const newTasks = [...this.data.newTasks, { name: val, remind: remindKey }]
    this.setData({ newTasks, inputValue: '' })
    saveDraftTasks(newTasks)
  },

  removeTask(e) {
    const newTasks = [...this.data.newTasks]
    newTasks.splice(e.currentTarget.dataset.index, 1)
    this.setData({ newTasks })
    saveDraftTasks(newTasks)
  },

  selectRemind(e) {
    this.setData({ remindHours: e.currentTarget.dataset.value })
  },

  toggleHistory() {
    this.setData({ showHistory: !this.data.showHistory })
  },

  readdTask(e) {
    const task = this.data.history[e.currentTarget.dataset.index]
    const remindKey = hoursToKey(this.data.remindHours)
    const newTasks = [...this.data.newTasks, { name: task.name, remind: remindKey }]
    this.setData({ newTasks })
    saveDraftTasks(newTasks)
  },

  _finishSubmit(toastLabel) {
    const tasks = [...this.data.newTasks]
    commitToHistory(tasks, this.data.remindHours)
    const all = loadAllTasks()
    this.setData({ newTasks: [], history: all.slice().reverse() })

    if (this.data.mode === 'focus' && tasks.length > 0) {
      this.loadFocusBreakdown(tasks.map(t => t.name))
    } else {
      wx.showToast({ title: toastLabel, icon: 'success' })
      setTimeout(() => wx.navigateBack(), 1500)
    }
  },

  loadFocusBreakdown(taskNames) {
    this.setData({ loadingBreakdown: true })
    wx.request({
      url: `${API}/focus-breakdown`,
      method: 'POST',
      header: HEADERS,
      data: {
        openid: this.data.openid || wx.getStorageSync('openid') || 'anonymous',
        tasks: taskNames
      },
      success: (r) => {
        this.setData({ breakdown: r.data, loadingBreakdown: false })
      },
      fail: () => {
        this.setData({ loadingBreakdown: false })
        wx.showToast({ title: '任务已保存', icon: 'success' })
        setTimeout(() => wx.navigateBack(), 1500)
      }
    })
  },

  goStart() {
    wx.showToast({ title: '加油！', icon: 'success' })
    setTimeout(() => wx.navigateBack(), 1000)
  },

  sendToBackend(openid) {
    wx.request({
      url: `${API}/submit-tasks`,
      method: 'POST',
      header: HEADERS,
      data: {
        openid,
        tasks: this.data.newTasks.map(t => t.name),
        remind_hours: this.data.remindHours
      },
      success: () => {
        const label = REMIND_OPTIONS.find(o => o.value === this.data.remindHours)?.label || ''
        this._finishSubmit(`已保存，${label}后提醒`)
      },
      fail: () => {
        this._finishSubmit('已本地保存（提醒不可用）')
      }
    })
  },

  submitTasks() {
    if (this.data.newTasks.length === 0) return

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
                header: HEADERS,
                data: { code: res.code },
                success: (r) => {
                  if (r.data.openid) {
                    wx.setStorageSync('openid', r.data.openid)
                    this.sendToBackend(r.data.openid)
                  } else {
                    this._finishSubmit('已本地保存（登录失败）')
                  }
                },
                fail: () => this._finishSubmit('已本地保存（网络错误）')
              })
            }
          })
        }
      },
      fail: () => {
        this._finishSubmit('已保存（未设置提醒）')
      }
    })
  }
})
