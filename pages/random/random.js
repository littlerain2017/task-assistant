const API = 'https://web-production-e223e.up.railway.app'
const TEMPLATE_ID = 'wnPOFUCqyZgTiMY7pdHoNgyG65k3VBC38JXLuOfXdZw'

const PALETTE = [
  [255, 36,  55 ],
  [255, 52,  116],
  [255, 145, 215],
  [255, 228, 0  ],
  [24,  174, 72 ],
  [36,  72,  190],
  [255, 132, 0  ],
  [160, 160, 160],
  [120, 20,  220],
  [0,   180, 155],
  [255, 70,  50 ],
]

const BIG_PILL_COLORS = [
  [255, 36,  55 ],
  [255, 52,  116],
  [120, 20,  220],
  [0,   180, 155],
  [255, 145, 215],
]

// 20% chance pool — serendipitous micro-tasks
const SERENDIPITY_TASKS = [
  '回顾一个梦境，写下来',
  '找一张照片来调色',
  '给许久未联系的朋友发条消息',
  '写下今天三件让你感激的小事',
  '找一首从没听过的歌听完',
  '随机翻一本书读三页',
  '在纸上随手涂鸦五分钟',
  '整理手机相册，删掉十张不需要的照片',
  '给自己泡一杯喜欢的茶',
  '写一段关于此刻心情的文字',
  '找一个想学的东西搜个入门教程',
  '画出脑海中一个模糊的场景',
  '整理桌上的一个小角落',
  '写下你最近喜欢的一句话',
  '找一张儿时的照片，想想当时的自己',
]

function gaussRandom(mean, std) {
  let u = 0, v = 0
  while (u === 0) u = Math.random()
  while (v === 0) v = Math.random()
  return mean + std * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

function rrPath(ctx, x, y, w, h, r) {
  const rad = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + rad, y)
  ctx.lineTo(x + w - rad, y)
  ctx.arcTo(x + w, y, x + w, y + rad, rad)
  ctx.lineTo(x + w, y + h - rad)
  ctx.arcTo(x + w, y + h, x + w - rad, y + h, rad)
  ctx.lineTo(x + rad, y + h)
  ctx.arcTo(x, y + h, x, y + h - rad, rad)
  ctx.lineTo(x, y + rad)
  ctx.arcTo(x, y, x + rad, y, rad)
  ctx.closePath()
}

Page({
  data: {
    loading: false,
    result: null,
    openid: '',
    hasTasks: false,
  },

  canvas: null,
  ctx: null,
  canvasWidth: 0,
  canvasHeight: 0,
  frameCount: 0,
  decorBubbles: [],
  taskBubbles: [],
  serendipityBubbles: [],
  selectedBubble: null,
  animating: false,
  todayTasks: [],

  onLoad() {
    const cached = wx.getStorageSync('openid')
    if (cached) this.setData({ openid: cached })
  },

  onReady() {
    this.initCanvas()
  },

  onShow() {
    const dateKey = new Date().toISOString().slice(0, 10)
    const all = wx.getStorageSync('all_tasks') || []
    this.todayTasks = all.filter(t => t.date === dateKey).map(t => t.name)

    this.selectedBubble = null
    this.setData({ hasTasks: this.todayTasks.length > 0, result: null })

    if (this.canvas) {
      this.createScene()
      if (!this.animating) this.startAnimation()
    }
  },

  onUnload() {
    this.animating = false
  },

  initCanvas() {
    const info = wx.getSystemInfoSync()
    const dpr = info.pixelRatio
    wx.createSelectorQuery()
      .select('#scatterCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res[0] || !res[0].node) return
        const canvas = res[0].node
        const ctx = canvas.getContext('2d')
        const w = res[0].width
        const h = res[0].height

        canvas.width = w * dpr
        canvas.height = h * dpr
        ctx.scale(dpr, dpr)

        this.canvas = canvas
        this.ctx = ctx
        this.canvasWidth = w
        this.canvasHeight = h

        this.createScene()
        this.startAnimation()
      })
  },

  createScene() {
    const W = this.canvasWidth
    const H = this.canvasHeight

    const tracks = [
      { y: H * 0.04,  density: 1.1,  xStart: -0.20, xEnd: 0.65 },
      { y: H * 0.12,  density: 0.9,  xStart: 0.40,  xEnd: 1.15 },
      { y: H * 0.21,  density: 1.0,  xStart: -0.15, xEnd: 0.75 },
      { y: H * 0.30,  density: 1.2,  xStart: 0.10,  xEnd: 1.10 },
      { y: H * 0.40,  density: 1.1,  xStart: -0.20, xEnd: 0.85 },
      { y: H * 0.50,  density: 1.0,  xStart: 0.25,  xEnd: 1.15 },
      { y: H * 0.60,  density: 1.1,  xStart: -0.15, xEnd: 0.70 },
      { y: H * 0.70,  density: 0.9,  xStart: 0.30,  xEnd: 1.10 },
      { y: H * 0.80,  density: 1.0,  xStart: -0.20, xEnd: 0.80 },
      { y: H * 0.90,  density: 1.1,  xStart: 0.15,  xEnd: 1.15 },
    ]

    const decors = []
    for (const track of tracks) {
      const count = Math.floor(48 * track.density)
      const span = (track.xEnd - track.xStart) * W
      for (let i = 0; i < count; i++) {
        const cx = track.xStart * W + Math.random() * span
        const x  = cx + gaussRandom(0, 36)
        const y  = track.y + gaussRandom(0, 10)
        const pill = Math.random() < 0.44
        const size = 10 + Math.random() * 22
        const color = PALETTE[Math.floor(Math.random() * PALETTE.length)]
        decors.push({
          x, y, baseY: y,
          w: pill ? 36 + Math.random() * 120 : size,
          h: pill ? 13 + Math.random() * 14  : size,
          speed: 0.8 + Math.random() * 2.4,
          driftOffset: Math.random() * 10000,
          floatAmp: 1.5 + Math.random() * 4.5,
          alpha: 90 + Math.random() * 110,
          color,
        })
      }
      for (let k = 0; k < 3; k++) {
        const color = BIG_PILL_COLORS[Math.floor(Math.random() * BIG_PILL_COLORS.length)]
        const bx = track.xStart * W + Math.random() * span
        const by = track.y + gaussRandom(0, 11)
        decors.push({
          x: bx, y: by, baseY: by,
          w: 100 + Math.random() * 130,
          h: 22  + Math.random() * 16,
          speed: 0.6 + Math.random() * 1.8,
          driftOffset: Math.random() * 10000,
          floatAmp: 1 + Math.random() * 2.5,
          alpha: 140 + Math.random() * 80,
          color,
        })
      }
    }
    this.decorBubbles = decors

    // Black task bubbles (user's own tasks)
    this.taskBubbles = this.todayTasks.map((name, i) => {
      const track = tracks[(i * 3 + 2) % tracks.length]
      const span  = (track.xEnd - track.xStart) * W
      const bw = Math.max(110, name.length * 19 + 60)
      const bh = 52 + Math.random() * 8
      return {
        id: 'task_' + i,
        title: name,
        x: track.xStart * W + Math.random() * span,
        y: track.y + gaussRandom(0, 14),
        baseY: track.y + gaussRandom(0, 14),
        w: bw, h: bh,
        speed: 1.0 + Math.random() * 1.8,
        driftOffset: Math.random() * 10000,
        floatAmp: 2 + Math.random() * 4,
      }
    })

    // Colored serendipity bubbles — always floating in the scene
    this.serendipityBubbles = SERENDIPITY_TASKS.map((name, i) => {
      const color = PALETTE[i % PALETTE.length]
      const track = tracks[(i * 2 + 1) % tracks.length]
      const span  = (track.xEnd - track.xStart) * W
      const bw = Math.max(120, name.length * 16 + 40)
      const bh = 46 + Math.random() * 6
      return {
        id: 'serend_' + i,
        title: name,
        x: track.xStart * W + Math.random() * span,
        y: track.y + gaussRandom(0, 18),
        baseY: track.y + gaussRandom(0, 18),
        w: bw, h: bh,
        speed: 0.7 + Math.random() * 1.4,
        driftOffset: Math.random() * 10000,
        floatAmp: 1.5 + Math.random() * 3,
        color,
      }
    })
  },

  startAnimation() {
    if (this.animating) return
    this.animating = true
    const tick = () => {
      if (!this.animating) return
      this.drawFrame()
      this.canvas.requestAnimationFrame(tick)
    }
    this.canvas.requestAnimationFrame(tick)
  },

  drawFrame() {
    const { ctx, canvasWidth: W, canvasHeight: H } = this
    this.frameCount++

    ctx.fillStyle = '#fffef8'
    ctx.fillRect(0, 0, W, H)

    for (const b of this.decorBubbles) {
      this._tick(b, W)
      this._drawDecor(b)
    }

    const selId = this.selectedBubble ? this.selectedBubble.id : null

    for (const b of this.serendipityBubbles) {
      this._tick(b, W)
      this._drawSerendipity(b, b.id === selId)
    }

    for (const b of this.taskBubbles) {
      this._tick(b, W)
      this._drawTask(b, b.id === selId)
    }
  },

  _tick(b, W) {
    b.x += b.speed
    b.y = b.baseY + Math.sin(this.frameCount * 0.012 + b.driftOffset) * b.floatAmp
    if (b.x > W + b.w + 80) b.x = -b.w - (40 + Math.random() * 160)
  },

  _drawDecor(b) {
    const { ctx } = this
    const [r, g, bl] = b.color
    const isBlack = r < 30 && g < 30 && bl < 30
    if (!isBlack) {
      for (let i = 2; i >= 1; i--) {
        const grow = i * 6
        ctx.fillStyle = `rgba(${r},${g},${bl},${b.alpha / (i * 5) / 255})`
        rrPath(ctx, b.x - grow / 2, b.y - grow / 2, b.w + grow, b.h + grow, 999)
        ctx.fill()
      }
    }
    ctx.fillStyle = `rgba(${r},${g},${bl},${b.alpha / 255})`
    rrPath(ctx, b.x, b.y, b.w, b.h, 999)
    ctx.fill()
  },

  // Colored serendipity bubbles — vivid, semi-transparent
  _drawSerendipity(b, isSelected) {
    const { ctx } = this
    const [r, g, bl] = b.color

    ctx.save()
    ctx.translate(b.x + b.w / 2, b.y + b.h / 2)
    if (isSelected) ctx.scale(1.08, 1.08)
    ctx.translate(-b.w / 2, -b.h / 2)

    ctx.fillStyle = `rgba(${r},${g},${bl},0.82)`
    rrPath(ctx, 0, 0, b.w, b.h, 999)
    ctx.fill()

    ctx.fillStyle = '#ffffff'
    ctx.font = '500 16px -apple-system, "PingFang SC", sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(b.title, b.w / 2, b.h / 2 + 0.5)

    ctx.restore()
  },

  // Black task bubbles — user's own tasks
  _drawTask(b, isSelected) {
    const { ctx } = this

    ctx.save()
    ctx.translate(b.x + b.w / 2, b.y + b.h / 2)
    if (isSelected) ctx.scale(1.08, 1.08)
    ctx.translate(-b.w / 2, -b.h / 2)

    ctx.fillStyle = 'rgba(8,8,8,0.97)'
    rrPath(ctx, 0, 0, b.w, b.h, 999)
    ctx.fill()

    ctx.fillStyle = 'rgba(255,255,255,0.07)'
    rrPath(ctx, 4, 2, b.w - 8, b.h * 0.4, 999)
    ctx.fill()

    ctx.fillStyle = '#ffffff'
    ctx.font = '600 18px -apple-system, "PingFang SC", sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(b.title, b.w / 2, b.h / 2 + 0.5)

    ctx.restore()
  },

  // Tap "让命运决定" — 80% user task, 20% serendipity
  pickAndStart() {
    if (this.data.loading) return

    let pickedName
    const hasUserTasks = this.todayTasks.length > 0

    if (hasUserTasks && Math.random() < 0.8) {
      pickedName = this.todayTasks[Math.floor(Math.random() * this.todayTasks.length)]
      this.selectedBubble = this.taskBubbles.find(b => b.title === pickedName) || null
    } else {
      pickedName = SERENDIPITY_TASKS[Math.floor(Math.random() * SERENDIPITY_TASKS.length)]
      this.selectedBubble = this.serendipityBubbles.find(b => b.title === pickedName) || null
    }

    this.setData({ loading: true })
    const openid = this.data.openid || wx.getStorageSync('openid') || 'anonymous'
    wx.requestSubscribeMessage({
      tmplIds: [TEMPLATE_ID],
      success: () => this._callApi(openid, pickedName),
      fail:    () => this._callApi(openid, pickedName),
    })
  },

  _callApi(openid, taskName) {
    wx.request({
      url: `${API}/random-start`,
      method: 'POST',
      header: { 'content-type': 'application/json' },
      data: { openid, goals: [taskName] },
      success: (r) => {
        this.setData({ loading: false })
        if (!r.data || r.data.error || !r.data.first_step) {
          wx.showModal({
            title: '拆解失败',
            content: r.data && r.data.error ? r.data.error : '请重试',
            showCancel: false,
          })
          return
        }
        this.animating = false
        this.setData({ result: r.data })
      },
      fail: () => {
        this.setData({ loading: false })
        wx.showToast({ title: '网络错误，请重试', icon: 'error' })
      },
    })
  },

  reroll() {
    this.selectedBubble = null
    this.setData({ result: null })
    this.animating = true
    this.startAnimation()
  },

  goStart() {
    this.animating = false
    wx.showToast({ title: '加油！30分钟后见', icon: 'success' })
    setTimeout(() => wx.navigateBack(), 1500)
  },

  goToFocus() {
    wx.navigateBack()
  },
})
