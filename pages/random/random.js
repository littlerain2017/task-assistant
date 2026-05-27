const API = 'https://web-production-e223e.up.railway.app'
const TEMPLATE_ID = 'wnPOFUCqyZgTiMY7pdHoNgyG65k3VBC38JXLuOfXdZw'

// Matches p5 palette exactly — charcoal restored
const PALETTE = [
  [255, 36,  55 ],
  [255, 52,  116],
  [255, 145, 215],
  [255, 228, 0  ],
  [24,  174, 72 ],
  [36,  72,  190],
  [255, 132, 0  ],
  [20,  20,  22 ],
]

const BIG_PILL_COLORS = [
  [255, 36,  55 ],
  [255, 52,  116],
  [255, 145, 215],
  [20,  20,  22 ],
]

const SERENDIPITY_TASKS = [
  '回顾一个梦境，写下来',
  '找一张照片来调色',
  '给许久未联系的朋友发条消息',
  '写下今天三件让你感激的小事',
  '找一首从没听过的歌听完',
  '随机翻一本书读三页',
  '在纸上随手涂鸦五分钟',
  '整理手机相册，删十张照片',
  '给自己泡一杯喜欢的茶',
  '写一段关于此刻心情的文字',
  '找一个想学的东西搜入门教程',
  '画出脑海中一个模糊的场景',
  '整理桌上的一个小角落',
  '写下你最近喜欢的一句话',
  '找一张儿时的照片想想自己',
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

    // Exact same 8-track layout as p5
    const tracks = [
      { y: H * 0.035, density: 1.15, xStart: -0.16, xEnd: 0.66 },
      { y: H * 0.115, density: 0.95, xStart: 0.52,  xEnd: 1.08 },
      { y: H * 0.175, density: 0.80, xStart: -0.02, xEnd: 0.44 },
      { y: H * 0.335, density: 1.38, xStart: -0.18, xEnd: 1.05 },
      { y: H * 0.635, density: 1.12, xStart: -0.18, xEnd: 0.62 },
      { y: H * 0.715, density: 1.02, xStart: 0.48,  xEnd: 1.08 },
      { y: H * 0.815, density: 1.00, xStart: -0.22, xEnd: 0.46 },
      { y: H * 0.925, density: 1.10, xStart: 0.18,  xEnd: 1.16 },
    ]

    const decors = []

    for (const track of tracks) {
      const count = Math.floor(54 * track.density)
      const span  = (track.xEnd - track.xStart) * W

      for (let i = 0; i < count; i++) {
        const cx    = track.xStart * W + Math.random() * span
        const x     = cx + gaussRandom(0, 38)
        const y     = track.y + gaussRandom(0, 11)
        const isPill = Math.random() < 0.46
        const size  = 10 + Math.random() * 24
        const color = PALETTE[Math.floor(Math.random() * PALETTE.length)]
        const isDark = color[0] < 30 && color[1] < 30 && color[2] < 30
        decors.push({
          x, y, baseY: y,
          w: isPill ? 34 + Math.random() * 122 : size,
          h: isPill ? 14 + Math.random() * 15  : size,
          speed:       0.035 + Math.random() * 0.105,
          driftOffset: Math.random() * 10000,
          floatAmp:    1 + Math.random() * 3.5,
          alpha: isDark ? 115 + Math.random() * 55 : 46 + Math.random() * 80,
          color,
        })
      }

      // Big overlay pills (3–5 per track, like p5)
      const bigCount = 3 + Math.floor(Math.random() * 3)
      for (let k = 0; k < bigCount; k++) {
        const color  = BIG_PILL_COLORS[Math.floor(Math.random() * BIG_PILL_COLORS.length)]
        const isDark = color[0] < 30 && color[1] < 30 && color[2] < 30
        const bx = track.xStart * W + Math.random() * span
        const by = track.y + (Math.random() * 24 - 12)
        decors.push({
          x: bx, y: by, baseY: by,
          w: 120 + Math.random() * 160,
          h: 24  + Math.random() * 16,
          speed:       0.025 + Math.random() * 0.075,
          driftOffset: Math.random() * 10000,
          floatAmp:    0.8 + Math.random() * 2.4,
          alpha: isDark ? 170 + Math.random() * 50 : 92 + Math.random() * 58,
          color,
        })
      }
    }

    this.decorBubbles = decors

    // User task bubbles — black style, varying font sizes like p5 layout
    const taskFontSizes = [30, 34, 36, 28, 32, 30, 34, 28, 32, 36]
    this.taskBubbles = this.todayTasks.map((name, i) => {
      const track    = tracks[(i * 3 + 2) % tracks.length]
      const span     = (track.xEnd - track.xStart) * W
      const fontSize = taskFontSizes[i % taskFontSizes.length]
      const bh = fontSize + 14
      const bw = Math.max(130, name.length * 20 + 60)
      const by = track.y - bh / 2 + gaussRandom(0, 14)
      return {
        id: 'task_' + i,
        title: name,
        x: track.xStart * W + Math.random() * span,
        y: by, baseY: by,
        w: bw, h: bh, fontSize,
        speed:       0.015 + Math.random() * 0.04,
        driftOffset: Math.random() * 10000,
        floatAmp:    0.5 + Math.random() * 2.3,
      }
    })

    // Serendipity bubbles — red style
    const serendFontSizes = [20, 24, 22, 26, 20, 24, 22, 26, 20, 24, 22, 26, 20, 24, 22]
    this.serendipityBubbles = SERENDIPITY_TASKS.map((name, i) => {
      const track    = tracks[(i * 2 + 1) % tracks.length]
      const span     = (track.xEnd - track.xStart) * W
      const fontSize = serendFontSizes[i % serendFontSizes.length]
      const bh = fontSize + 12
      const bw = Math.max(110, name.length * 16 + 40)
      const by = track.y - bh / 2 + gaussRandom(0, 18)
      return {
        id: 'serend_' + i,
        title: name,
        x: track.xStart * W + Math.random() * span,
        y: by, baseY: by,
        w: bw, h: bh, fontSize,
        speed:       0.015 + Math.random() * 0.04,
        driftOffset: Math.random() * 10000,
        floatAmp:    0.5 + Math.random() * 2.3,
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

    this._drawPaperTexture()

    for (const b of this.decorBubbles) {
      this._tick(b, W)
      this._drawDecor(b)
    }

    const selId = this.selectedBubble ? this.selectedBubble.id : null

    for (const b of this.serendipityBubbles) {
      this._tick(b, W)
      this._drawLabel(b, [255, 36, 55], 175, b.id === selId)
    }

    for (const b of this.taskBubbles) {
      this._tick(b, W)
      this._drawLabel(b, [15, 15, 17], 210, b.id === selId)
    }
  },

  _tick(b, W) {
    b.x += b.speed
    b.y = b.baseY + Math.sin(this.frameCount * 0.01 + b.driftOffset) * b.floatAmp
    if (b.x > W + b.w + 100) b.x = -b.w - (40 + Math.random() * 200)
  },

  // Subtle paper texture — 65 micro-dots + warm tint, matches p5's drawPaperTexture
  _drawPaperTexture() {
    const { ctx, canvasWidth: W, canvasHeight: H } = this
    ctx.fillStyle = 'rgba(0,0,0,0.012)'
    for (let i = 0; i < 65; i++) {
      ctx.beginPath()
      ctx.arc(Math.random() * W, Math.random() * H, 0.15 + Math.random() * 0.35, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.fillStyle = 'rgba(255,245,218,0.027)'
    ctx.fillRect(0, 0, W, H)
  },

  // 4-pass ink diffusion — matches p5's drawReferenceLikeBubble
  _drawDecor(b) {
    const { ctx } = this
    const [r, g, bl] = b.color

    for (let i = 4; i >= 1; i--) {
      const grow = i * 5
      ctx.fillStyle = `rgba(${r},${g},${bl},${b.alpha / (i * 4) / 255})`
      rrPath(ctx, b.x - grow / 2, b.y - grow / 2, b.w + grow, b.h + grow, 999)
      ctx.fill()
    }

    ctx.fillStyle = `rgba(${r},${g},${bl},${b.alpha / 255})`
    rrPath(ctx, b.x, b.y, b.w, b.h, 999)
    ctx.fill()

    ctx.fillStyle = 'rgba(255,255,255,0.047)'
    rrPath(ctx, b.x + 4, b.y + 3, Math.max(1, b.w - 8), Math.max(1, b.h * 0.36), 999)
    ctx.fill()
  },

  // 3-pass glow + white text — matches p5's drawTextLabel
  _drawLabel(b, fillColor, alpha, isSelected) {
    const { ctx } = this
    const [r, g, bl] = fillColor

    ctx.save()
    ctx.translate(b.x + b.w / 2, b.y + b.h / 2)
    if (isSelected) ctx.scale(1.08, 1.08)
    ctx.translate(-b.w / 2, -b.h / 2)

    for (let i = 3; i >= 1; i--) {
      const grow = i * 4
      ctx.fillStyle = `rgba(${r},${g},${bl},${alpha / (i * 4) / 255})`
      rrPath(ctx, -grow / 2, -grow / 2, b.w + grow, b.h + grow, 999)
      ctx.fill()
    }

    ctx.fillStyle = `rgba(${r},${g},${bl},${alpha / 255})`
    rrPath(ctx, 0, 0, b.w, b.h, 999)
    ctx.fill()

    ctx.fillStyle = 'rgba(255,255,255,0.91)'
    ctx.font = `normal ${b.fontSize}px -apple-system, "PingFang SC", sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(b.title, b.w / 2, b.h / 2 + 1)

    ctx.restore()
  },

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
