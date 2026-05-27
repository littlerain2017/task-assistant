const API = 'https://web-production-e223e.up.railway.app'
const TEMPLATE_ID = 'wnPOFUCqyZgTiMY7pdHoNgyG65k3VBC38JXLuOfXdZw'

const PALETTE = [
  [255, 36,  55 ],   // vivid red
  [255, 52,  116],   // hot pink
  [255, 145, 215],   // soft pink
  [255, 228, 0  ],   // lemon yellow
  [24,  174, 72 ],   // green
  [36,  72,  190],   // cobalt blue
  [255, 132, 0  ],   // orange
  [160, 160, 160],   // gray
  [120, 20,  220],   // deep purple
  [0,   180, 155],   // teal
  [255, 70,  50 ],   // coral
]

const BIG_PILL_COLORS = [
  [255, 36,  55 ],
  [255, 52,  116],
  [120, 20,  220],
  [0,   180, 155],
  [255, 145, 215],
]

// Box-Muller transform — replaces p5's randomGaussian()
function gaussRandom(mean, std) {
  let u = 0, v = 0
  while (u === 0) u = Math.random()
  while (v === 0) v = Math.random()
  return mean + std * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

// Draws a rounded-rect path — replaces p5's rect(x,y,w,h,radius)
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
    selectedTask: null,
    hasTasks: false,
  },

  // Canvas state (not reactive — kept off setData for perf)
  canvas: null,
  ctx: null,
  canvasWidth: 0,
  canvasHeight: 0,
  frameCount: 0,
  decorBubbles: [],
  taskBubbles: [],
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
    this.setData({
      hasTasks: this.todayTasks.length > 0,
      result: null,
      selectedTask: null,
    })

    if (this.canvas && this.todayTasks.length > 0) {
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

        if (this.todayTasks.length > 0) {
          this.createScene()
          this.startAnimation()
        }
      })
  },

  // Builds decorBubbles + taskBubbles — mirrors createScene() in p5 sketch
  createScene() {
    const W = this.canvasWidth
    const H = this.canvasHeight

    // More tracks, full coverage for dense dark look
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

      // Large horizontal pills per track — mostly black, some color
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

    // Task bubbles — one per today's task, clickable
    this.taskBubbles = this.todayTasks.map((name, i) => {
      const color = PALETTE[i % PALETTE.length]
      const track = tracks[(i * 3 + 2) % tracks.length]
      const span  = (track.xEnd - track.xStart) * W
      const bw = Math.max(110, name.length * 19 + 60)
      const bh = 52 + Math.random() * 8
      const bx = track.xStart * W + Math.random() * span
      const by = track.y + gaussRandom(0, 14)
      return {
        id: 'task_' + i,
        title: name,
        x: bx, y: by, baseY: by,
        w: bw, h: bh,
        speed: 1.0 + Math.random() * 1.8,
        driftOffset: Math.random() * 10000,
        floatAmp: 2 + Math.random() * 4,
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

  // Print-diffusion style — ink bleeding on paper, soft edge for colored, crisp for black
  _drawDecor(b) {
    const { ctx } = this
    const [r, g, bl] = b.color
    const isBlack = r < 30 && g < 30 && bl < 30

    if (!isBlack) {
      // Colored bubbles: 2-pass soft halo like ink spreading on paper
      for (let i = 2; i >= 1; i--) {
        const grow = i * 6
        ctx.fillStyle = `rgba(${r},${g},${bl},${b.alpha / (i * 5) / 255})`
        rrPath(ctx, b.x - grow / 2, b.y - grow / 2, b.w + grow, b.h + grow, 999)
        ctx.fill()
      }
    }

    // Main body
    ctx.fillStyle = `rgba(${r},${g},${bl},${b.alpha / 255})`
    rrPath(ctx, b.x, b.y, b.w, b.h, 999)
    ctx.fill()
  },

  _drawTask(b, isSelected) {
    const { ctx } = this

    ctx.save()
    ctx.translate(b.x + b.w / 2, b.y + b.h / 2)

    if (isSelected) {
      ctx.scale(1.08, 1.08)
    }

    ctx.translate(-b.w / 2, -b.h / 2)

    ctx.fillStyle = 'rgba(8,8,8,0.97)'
    rrPath(ctx, 0, 0, b.w, b.h, 999)
    ctx.fill()

    // Top sheen
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

  // Touch hit-test against task bubbles (mirrors mousePressed)
  onTouchStart(e) {
    if (!e.touches[0]) return
    const touch = e.touches[0]
    // WeChat provides element-relative x/y on canvas touch events
    const tx = touch.x !== undefined ? touch.x : touch.clientX
    const ty = touch.y !== undefined ? touch.y : touch.clientY

    for (let i = this.taskBubbles.length - 1; i >= 0; i--) {
      const b = this.taskBubbles[i]
      if (tx >= b.x && tx <= b.x + b.w && ty >= b.y && ty <= b.y + b.h) {
        this.selectedBubble = b
        this.setData({ selectedTask: b.title })
        return
      }
    }
    // Tapped background — deselect
    this.selectedBubble = null
    this.setData({ selectedTask: null })
  },

  startTask() {
    if (!this.selectedBubble || this.data.loading) return
    this.setData({ loading: true })
    const openid = this.data.openid || wx.getStorageSync('openid') || 'anonymous'
    wx.requestSubscribeMessage({
      tmplIds: [TEMPLATE_ID],
      success: () => this._callApi(openid),
      fail:    () => this._callApi(openid),
    })
  },

  _callApi(openid) {
    wx.request({
      url: `${API}/random-start`,
      method: 'POST',
      header: { 'content-type': 'application/json' },
      data: { openid, goals: [this.selectedBubble.title] },
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
    this.setData({ result: null, selectedTask: null })
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
