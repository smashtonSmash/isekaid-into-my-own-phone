import type { ReactNode } from 'react'
import lumiUrl from '../assets/portraits/lumi.jpg'
import miriUrl from '../assets/portraits/miri.jpg'
import { GUILD_MASTER, VILLAGERS, type Look } from '../game/data.ts'
import type { VillagerId } from '../game/types.ts'

const PHOTOS: Record<string, string> = {
  lumi: lumiUrl,
  miri: miriUrl,
}

function lookFor(who: string): Look | null {
  if (who === 'vale') return GUILD_MASTER.look
  if (who in VILLAGERS) return VILLAGERS[who as VillagerId].look
  return null
}

/** Lumi and Miri use the high-res portraits. Everyone else is a painted stand-in for a later picture. */
export function Portrait({ who, alt }: { who: string; alt: string }) {
  const photo = PHOTOS[who]
  if (photo) return <img src={photo} alt={alt} />
  const look = lookFor(who)
  if (!look) return null
  return <Bust look={look} alt={alt} tag={who} />
}

function Bust({ look, alt, tag }: { look: Look; alt: string; tag: string }) {
  const skyId = `sky-${tag}`
  return (
    <svg viewBox="0 0 120 160" role="img" aria-label={alt}>
      <defs>
        <linearGradient id={skyId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f7e7c8" />
          <stop offset="1" stopColor="#f3c9a0" />
        </linearGradient>
      </defs>
      <rect width="120" height="160" fill={`url(#${skyId})`} />
      <ellipse cx="60" cy="168" rx="46" ry="36" fill={look.cloth} />
      <rect x="34" y="108" width="52" height="28" rx="16" fill={look.skin} />
      <circle cx="60" cy="78" r="28" fill={look.skin} />
      <path d="M32 78c2-28 16-42 28-42s26 14 28 42c-8-8-18-10-28-10s-20 2-28 10z" fill={look.hair} />
      <path d="M34 70c6 18 46 18 52 0" fill={look.hair} />
      {look.extra === 'cat' && (
        <>
          <path d="M38 58l8 16-14 2z" fill={look.hair} />
          <path d="M82 58l-8 16 14 2z" fill={look.hair} />
        </>
      )}
      {look.extra === 'braid' && <path d="M78 90c8 10 6 28-2 36" stroke={look.hair} strokeWidth="6" fill="none" />}
      {(look.extra === 'hat' || look.extra === 'sunhat') && (
        <>
          <ellipse cx="60" cy="58" rx={look.extra === 'sunhat' ? 40 : 26} ry="8" fill="#f4e2b0" />
          <rect x="46" y="40" width="28" height="18" rx="8" fill="#f4e2b0" />
        </>
      )}
      {look.extra === 'clasp' && <circle cx="78" cy="62" r="4" fill="#e6c15a" />}
      <ellipse cx="50" cy="80" rx="3.2" ry="3.6" fill={look.eye} />
      <ellipse cx="70" cy="80" rx="3.2" ry="3.6" fill={look.eye} />
      <path d="M54 92c4 4 8 4 12 0" stroke="#c47a6a" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      {look.extra === 'glasses' && (
        <>
          <circle cx="50" cy="80" r="8" fill="none" stroke="#222" strokeWidth="1.4" />
          <circle cx="70" cy="80" r="8" fill="none" stroke="#222" strokeWidth="1.4" />
          <path d="M58 80h4" stroke="#222" strokeWidth="1.4" />
        </>
      )}
      {look.extra === 'beard' && <path d="M46 96c4 16 24 16 28 0" fill={look.hair} />}
      {look.extra === 'mustache' && <path d="M50 90h20" stroke="#ddd6cc" strokeWidth="2" strokeLinecap="round" />}
    </svg>
  )
}

export function Speech({
  who,
  name,
  line,
  children,
}: {
  who: string
  name: string
  line: string
  children?: ReactNode
}) {
  return (
    <div className="speech">
      <div className="portrait-slot">
        <Portrait who={who} alt={`${name} portrait`} />
      </div>
      <div className="speech-copy">
        <p className="kicker">{name}</p>
        <p>{line}</p>
        {children}
      </div>
    </div>
  )
}
