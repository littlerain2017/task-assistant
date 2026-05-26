const QUOTES = [
  'scattered mind',
  '散乱的思绪',
  '散らかった心',
  'esprit dispersé',
  'mente dispersa',
  'zerstreuter Geist',
  '흩어진 마음',
  'рассеянный ум',
  'mente dispersa',
  'عقل مشتَّت',
  'बिखरा हुआ मन',
  'จิตใจที่กระจัดกระจาย',
  'mente dispersa'
]

const COLORS = ['#a78bfa', '#60a5fa', '#f472b6', '#34d399', '#fb923c', '#fbbf24', '#e879f9']

Page({
  data: {
    today: '',
    taskCount: 0,
    doneCount: 0,
    quote: ''
  },

  canvas: null,
  ctx: null,
  planets: [],
  stars: [],
  canvasWidth: 0,
  canvasHeight: 0,
  centerX: 0,
  centerY: 0,

  onShow() {
    const date = new Date()
    const today = `${date.getFullYear()}.${date.getMonth() + 1}.${date.getDate()}`
    const quote = QUOTES[Math.floor(Math.random() * QUOTES.length)]
    this.setData({ today, quote })
    this.loadTasks()
  },

  onReady() {
    this.initCanvas()
  },

  loadTasks() {
    const dateKey = new Date().toISOString().slice(0, 10)
    const tasks = wx.getStorageSync(`tasks_${dateKey}`) || []
    const doneCount = tasks.filter(t => t.status === '已完成').length
    this.setData({ taskCount: tasks.length, doneCount })
  },

  initCanvas() {
    const info = wx.getSystemInfoSync()
    const dpr = info.pixelRatio
    const query = wx.createSelectorQuery()
    query.select('#spaceCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
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
        this.centerX = w / 2
        this.centerY = h / 2

        this.generateStars()
        this.planets = this.createInitialPlanets()
        this.startAnimation()
      })
  },

  generateStars() {
    const { canvasWidth, canvasHeight } = this
    this.stars = Array.from({ length: 120 }, () => ({
      x: Math.random() * canvasWidth,
      y: Math.random() * canvasHeight,
      size: Math.random() * 1.5 + 0.3,
      opacity: 0.2 + Math.random() * 0.6
    }))
  },

  createInitialPlanets() {
    const { centerX, centerY } = this
    return [
      { cx: centerX, cy: centerY, orbitR: 70,  angle: 0,    speed: 0.009,  size: 16, color: '#a78bfa' },
      { cx: centerX, cy: centerY, orbitR: 130, angle: 2.1,  speed: 0.006,  size: 11, color: '#60a5fa' },
      { cx: centerX, cy: centerY, orbitR: 190, angle: 4.2,  speed: 0.004,  size: 20, color: '#fb923c' },
      { cx: centerX, cy: centerY, orbitR: 45,  angle: 1.0,  speed: 0.015,  size: 7,  color: '#34d399' },
    ]
  },

  startAnimation() {
    const loop = () => {
      this.drawFrame()
      this.canvas.requestAnimationFrame(loop)
    }
    this.canvas.requestAnimationFrame(loop)
  },

  drawFrame() {
    const { ctx, canvasWidth, canvasHeight, centerX, centerY, stars, planets } = this

    ctx.fillStyle = '#080818'
    ctx.fillRect(0, 0, canvasWidth, canvasHeight)

    stars.forEach(s => {
      ctx.beginPath()
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(255,255,255,${s.opacity})`
      ctx.fill()
    })

    planets.forEach(p => {
      p.angle += p.speed

      const x = p.cx + Math.cos(p.angle) * p.orbitR
      const y = p.cy + Math.sin(p.angle) * p.orbitR

      ctx.beginPath()
      ctx.arc(p.cx, p.cy, p.orbitR, 0, Math.PI * 2)
      ctx.strokeStyle = 'rgba(255,255,255,0.04)'
      ctx.lineWidth = 1
      ctx.stroke()

      const grad = ctx.createRadialGradient(x - p.size * 0.3, y - p.size * 0.3, 0, x, y, p.size)
      grad.addColorStop(0, '#ffffff')
      grad.addColorStop(0.4, p.color)
      grad.addColorStop(1, 'rgba(0,0,0,0.6)')
      ctx.beginPath()
      ctx.arc(x, y, p.size, 0, Math.PI * 2)
      ctx.fillStyle = grad
      ctx.fill()
    })

    const sunGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 24)
    sunGrad.addColorStop(0, '#fffde7')
    sunGrad.addColorStop(0.5, '#fbbf24')
    sunGrad.addColorStop(1, 'rgba(251,191,36,0)')
    ctx.beginPath()
    ctx.arc(centerX, centerY, 24, 0, Math.PI * 2)
    ctx.fillStyle = sunGrad
    ctx.fill()
  },

  onTap(e) {
    const { x, y } = e.touches[0]
    const dx = x - this.centerX
    const dy = y - this.centerY
    const orbitR = Math.sqrt(dx * dx + dy * dy)
    const color = COLORS[Math.floor(Math.random() * COLORS.length)]
    const size = 5 + Math.random() * 14
    const speed = (0.003 + Math.random() * 0.012) * (Math.random() > 0.5 ? 1 : -1)

    this.planets.push({
      cx: this.centerX,
      cy: this.centerY,
      orbitR,
      angle: Math.atan2(dy, dx),
      speed,
      size,
      color
    })
  },

  goToTasks() {
    wx.navigateTo({ url: '/pages/tasks/tasks' })
  },

  goToProgress() {
    wx.navigateTo({ url: '/pages/progress/progress' })
  }
})
