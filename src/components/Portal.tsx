import { useEffect, useRef } from 'react'

const GROW_S = 1.35
const WHITE_S = 0.4
const FADE_S = 0.75

/** Turquoise and starlight, growing from the middle of the glass until the white takes over. */
export function Portal({ onDone }: { onDone: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const doneRef = useRef(onDone)

  useEffect(() => {
    doneRef.current = onDone
  })

  useEffect(() => {
    const canvas = canvasRef.current
    const parent = canvas?.parentElement
    if (!canvas || !parent) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const stars = Array.from({ length: reduce ? 36 : 90 }, () => ({
      arm: Math.floor(Math.random() * 5),
      along: Math.random(),
      size: 0.6 + Math.random() * 1.8,
      tw: Math.random() * Math.PI * 2,
    }))
    const specks = Array.from({ length: reduce ? 24 : 70 }, () => ({
      a: Math.random() * Math.PI * 2,
      d: 0.15 + Math.random() * 0.85,
      size: Math.random() * 1.6 + 0.4,
      tw: Math.random() * Math.PI * 2,
    }))
    let raf = 0
    const start = performance.now()

    const frame = (now: number) => {
      const t = (now - start) / 1000
      const grow = reduce ? Math.min(1, t / 0.45) : Math.min(1, t / GROW_S)
      const whiteStart = reduce ? 0.45 : GROW_S
      const whiteDur = reduce ? 0.25 : WHITE_S
      const fadeStart = whiteStart + whiteDur
      const fadeDur = reduce ? 0.35 : FADE_S
      const white = t < whiteStart ? 0 : Math.min(1, (t - whiteStart) / whiteDur)
      const fade = t < fadeStart ? 1 : Math.max(0, 1 - (t - fadeStart) / fadeDur)
      const width = parent.clientWidth
      const height = parent.clientHeight
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      if (canvas.width !== Math.floor(width * dpr) || canvas.height !== Math.floor(height * dpr)) {
        canvas.width = Math.floor(width * dpr)
        canvas.height = Math.floor(height * dpr)
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, width, height)
      const cx = width / 2
      const cy = height / 2
      const reach = Math.hypot(width, height) * (0.08 + grow * 0.72)
      const spin = t * (reduce ? 0.4 : 2.4)

      const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, reach)
      glow.addColorStop(0, `rgba(232, 255, 252, ${0.35 + grow * 0.4})`)
      glow.addColorStop(0.25, `rgba(62, 220, 206, ${0.45 * grow})`)
      glow.addColorStop(0.6, `rgba(14, 90, 110, ${0.25 * grow})`)
      glow.addColorStop(1, 'rgba(4, 22, 28, 0)')
      ctx.fillStyle = glow
      ctx.fillRect(0, 0, width, height)

      ctx.save()
      ctx.translate(cx, cy)
      ctx.rotate(spin)
      for (const star of stars) {
        const angle = star.arm * ((Math.PI * 2) / 5) + star.along * 3.4
        const radius = star.along * reach
        const x = Math.cos(angle) * radius
        const y = Math.sin(angle) * radius * 0.92
        const twinkle = 0.45 + Math.sin(t * 6 + star.tw) * 0.55
        ctx.fillStyle = `rgba(255, 255, 255, ${twinkle})`
        ctx.beginPath()
        ctx.arc(x, y, star.size + grow, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = `rgba(126, 246, 234, ${0.35 * twinkle})`
        ctx.beginPath()
        ctx.arc(x, y, (star.size + grow) * 2.4, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.restore()

      for (const speck of specks) {
        const radius = speck.d * reach
        const angle = speck.a + spin * 0.65
        const x = cx + Math.cos(angle) * radius
        const y = cy + Math.sin(angle) * radius
        const twinkle = 0.35 + Math.sin(t * 8 + speck.tw) * 0.65
        ctx.fillStyle = `rgba(255, 255, 245, ${twinkle})`
        ctx.fillRect(x, y, speck.size, speck.size)
      }

      if (white > 0) {
        ctx.fillStyle = `rgba(255, 255, 255, ${white})`
        ctx.fillRect(0, 0, width, height)
      }
      parent.style.opacity = String(fade)
      if (fade <= 0) {
        doneRef.current()
        return
      }
      raf = requestAnimationFrame(frame)
    }

    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div className="portal" aria-hidden="true">
      <canvas ref={canvasRef} />
    </div>
  )
}
