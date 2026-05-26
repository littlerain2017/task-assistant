function loadAllTasks() {
  return wx.getStorageSync('all_tasks') || []
}

function saveAllTasks(tasks) {
  wx.setStorageSync('all_tasks', tasks)
}

Page({
  data: {
    groups: []
  },

  onShow() {
    const all = loadAllTasks()
    const map = {}
    all.forEach(t => {
      if (!map[t.date]) map[t.date] = []
      map[t.date].push(t)
    })
    const groups = Object.keys(map).sort().reverse().map(date => ({
      date,
      tasks: map[date]
    }))
    this.setData({ groups })
  },

  onSliderChanging(e) {
    const { gindex, tindex } = e.currentTarget.dataset
    const groups = this.data.groups.map(g => ({ ...g, tasks: [...g.tasks] }))
    groups[gindex].tasks[tindex].progress = e.detail.value
    this.setData({ groups })
  },

  onSliderChange(e) {
    const { gindex, tindex } = e.currentTarget.dataset
    const groups = this.data.groups.map(g => ({ ...g, tasks: [...g.tasks] }))
    groups[gindex].tasks[tindex].progress = e.detail.value
    this.setData({ groups })

    const all = loadAllTasks()
    const task = groups[gindex].tasks[tindex]
    const idx = all.findIndex(t => t.id === task.id)
    if (idx !== -1) {
      all[idx].progress = e.detail.value
      saveAllTasks(all)
    }
  },

  submitProgress() {
    wx.showToast({ title: '进度已更新', icon: 'success' })
    setTimeout(() => wx.navigateBack(), 1500)
  }
})
