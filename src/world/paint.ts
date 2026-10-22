import { CanvasTexture, RepeatWrapping, SRGBColorSpace, type Texture } from 'three'

export type PaintSet = {
  grass: Texture
  soil: Texture
  path: Texture
  thatch: Texture
  plaster: Texture
  timber: Texture
  bark: Texture
  leaf: Texture
  blossom: Texture
  water: Texture
  wheat: Texture
  stone: Texture
}

function mulberry32(seed: number) {
  let value = seed >>> 0
  return () => {
    value = (value + 0x6d2b79f5) >>> 0
    let t = Math.imul(value ^ (value >>> 15), value | 1)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function finish(canvas: HTMLCanvasElement, repeatX = 1, repeatY = 1): Texture {
  const tex = new CanvasTexture(canvas)
  tex.colorSpace = SRGBColorSpace
  tex.wrapS = RepeatWrapping
  tex.wrapT = RepeatWrapping
  tex.repeat.set(repeatX, repeatY)
  tex.anisotropy = 8
  tex.needsUpdate = true
  return tex
}

function canvas(size: number, paint: (ctx: CanvasRenderingContext2D, rand: () => number) => void, seed: number, repeat = 1): Texture {
  const el = document.createElement('canvas')
  el.width = size
  el.height = size
  const ctx = el.getContext('2d')
  if (!ctx) return finish(el, repeat, repeat)
  paint(ctx, mulberry32(seed))
  return finish(el, repeat, repeat)
}

function blot(ctx: CanvasRenderingContext2D, rand: () => number, colors: string[], count: number) {
  const { width, height } = ctx.canvas
  ctx.fillStyle = colors[0] ?? '#fff'
  ctx.fillRect(0, 0, width, height)
  for (let i = 0; i < count; i += 1) {
    ctx.fillStyle = colors[Math.floor(rand() * colors.length)] ?? colors[0] ?? '#fff'
    ctx.globalAlpha = 0.35 + rand() * 0.55
    ctx.beginPath()
    ctx.ellipse(rand() * width, rand() * height, 6 + rand() * 28, 4 + rand() * 18, rand() * Math.PI, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1
}

let cache: PaintSet | null = null

export function getPaint(): PaintSet {
  if (cache) return cache
  cache = {
    grass: canvas(512, (ctx, rand) => {
      blot(ctx, rand, ['#6fa844', '#87c256', '#5e9338', '#9ed36a', '#78b84c'], 700)
      const { width, height } = ctx.canvas
      for (let i = 0; i < 80; i += 1) {
        ctx.fillStyle = rand() > 0.5 ? '#f2d36a' : rand() > 0.5 ? '#f4a8c4' : '#ffffff'
        ctx.globalAlpha = 0.85
        ctx.beginPath()
        ctx.arc(rand() * width, rand() * height, 1.4 + rand() * 2.2, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1
    }, 3, 6),
    soil: canvas(256, (ctx, rand) => {
      blot(ctx, rand, ['#a56b3a', '#c4894e', '#8d552c', '#d7a56a', '#6f8a3a'], 220)
    }, 9, 1),
    path: canvas(256, (ctx, rand) => {
      blot(ctx, rand, ['#e6d0a4', '#d2b488', '#c4a06a', '#f0e0bf', '#b89262'], 260)
    }, 5, 2),
    thatch: canvas(256, (ctx, rand) => {
      const { width, height } = ctx.canvas
      ctx.fillStyle = '#e7c56a'
      ctx.fillRect(0, 0, width, height)
      for (let y = 0; y < height; y += 4) {
        ctx.strokeStyle = y % 8 === 0 ? '#c48a32' : '#f6e2a0'
        ctx.globalAlpha = 0.55
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(0, y)
        for (let x = 0; x <= width; x += 12) ctx.lineTo(x, y + Math.sin(x * 0.15 + y) * 1.5)
        ctx.stroke()
      }
      ctx.globalAlpha = 1
      for (let i = 0; i < 40; i += 1) {
        ctx.fillStyle = rand() > 0.5 ? '#a86a28' : '#f8e8b8'
        ctx.fillRect(rand() * width, rand() * height, 8, 2)
      }
    }, 4, 1),
    plaster: canvas(256, (ctx, rand) => {
      blot(ctx, rand, ['#f7f1e6', '#fffaf3', '#efe2d0', '#f3e6d4'], 180)
    }, 6, 1),
    timber: canvas(128, (ctx, rand) => {
      blot(ctx, rand, ['#7a4e32', '#5c3824', '#8d5e3c', '#a06a42'], 80)
    }, 2, 1),
    bark: canvas(128, (ctx, rand) => {
      const { width, height } = ctx.canvas
      ctx.fillStyle = '#6b442c'
      ctx.fillRect(0, 0, width, height)
      ctx.strokeStyle = '#4a2c1c'
      for (let x = 4; x < width; x += 10) {
        ctx.globalAlpha = 0.45 + rand() * 0.4
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.bezierCurveTo(x + 4, height * 0.3, x - 4, height * 0.6, x + 2, height)
        ctx.stroke()
      }
      ctx.globalAlpha = 1
    }, 8, 1),
    leaf: canvas(256, (ctx, rand) => {
      blot(ctx, rand, ['#3f8a32', '#67b84a', '#2f6e28', '#8ed15f', '#4e9a3c'], 280)
    }, 11, 1),
    blossom: canvas(256, (ctx, rand) => {
      blot(ctx, rand, ['#f3b7cb', '#f7d0dc', '#e989a8', '#fff', '#d36a8c'], 240)
    }, 12, 1),
    water: canvas(256, (ctx) => {
      const { width, height } = ctx.canvas
      const gradient = ctx.createLinearGradient(0, 0, 0, height)
      gradient.addColorStop(0, '#d7f4fb')
      gradient.addColorStop(0.45, '#7ec8e6')
      gradient.addColorStop(1, '#3f93c4')
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, width, height)
      ctx.strokeStyle = 'rgba(255,255,255,0.55)'
      ctx.lineWidth = 2
      for (let y = 6; y < height; y += 14) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        for (let x = 0; x <= width; x += 10) ctx.lineTo(x, y + Math.sin(x * 0.18 + y) * 3)
        ctx.stroke()
      }
    }, 1, 1),
    wheat: canvas(256, (ctx, rand) => {
      blot(ctx, rand, ['#e6c85a', '#f3de8a', '#d7a63a', '#c48a32', '#f7e7a8'], 300)
    }, 14, 2),
    stone: canvas(256, (ctx, rand) => {
      blot(ctx, rand, ['#e7dfd2', '#d5cbb8', '#f6f1e8', '#c4b8a4'], 160)
      const { width, height } = ctx.canvas
      ctx.strokeStyle = 'rgba(120,90,60,0.25)'
      ctx.strokeRect(8, 8, width / 2 - 12, height / 2 - 12)
      ctx.strokeRect(width / 2 + 4, height / 2 + 4, width / 2 - 12, height / 2 - 12)
    }, 7, 1),
  }
  return cache
}
