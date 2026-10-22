import type { ReactNode } from 'react'

export type PhoneTab = 'home' | 'village' | 'friends' | 'storage' | 'adventure'

const TABS: { id: PhoneTab; label: string; icon: ReactNode }[] = [
  { id: 'home', label: 'Home', icon: <HouseIcon /> },
  { id: 'village', label: 'Village', icon: <SignIcon /> },
  { id: 'friends', label: 'Friends', icon: <PeopleIcon /> },
  { id: 'storage', label: 'Storage', icon: <PackIcon /> },
  { id: 'adventure', label: 'Adventure', icon: <MapIcon /> },
]

export function TopBar({
  name,
  level,
  xp,
  nextXp,
  glim,
  stardust,
  taxText,
  taxReady,
  onTax,
}: {
  name: string
  level: number
  xp: number
  nextXp: number
  glim: number
  stardust: number
  taxText: string
  taxReady: boolean
  onTax: () => void
}) {
  return (
    <header className="topbar">
      <div className="player-plate">
        <div className="avatar" aria-hidden="true">
          <TravelerFace />
        </div>
        <div className="name-wood">
          <strong>{name}</strong>
          <span className="lv-row">
            Lv. {level}
            <i className="xp" aria-hidden="true">
              <b style={{ width: `${Math.min(100, (xp / nextXp) * 100)}%` }} />
            </i>
          </span>
          <button type="button" className={`tax-line ${taxReady ? 'ready' : ''}`} onClick={onTax}>
            {taxText}
          </button>
        </div>
      </div>
      <div className="currencies">
        <div className="currency" aria-label={`${glim} glim`}>
          <i className="coin" aria-hidden="true" />
          <span>{glim.toLocaleString('en-US')}</span>
        </div>
        <div className="currency" aria-label={`${stardust} stardust`}>
          <i className="gem" aria-hidden="true" />
          <span>{stardust.toLocaleString('en-US')}</span>
        </div>
      </div>
    </header>
  )
}

export function TabBar({ tab, onTab }: { tab: PhoneTab; onTab: (tab: PhoneTab) => void }) {
  return (
    <nav className="tabbar" aria-label="Phone">
      {TABS.map((item) => (
        <button
          key={item.id}
          type="button"
          className={tab === item.id ? 'on' : ''}
          aria-current={tab === item.id ? 'page' : undefined}
          onClick={() => onTab(item.id)}
        >
          {item.icon}
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  )
}

export function BuildButton({ placing, onClick }: { placing: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      className={`build-btn ${placing ? 'on' : ''}`}
      aria-pressed={placing}
      aria-label={placing ? 'Cancel placement' : 'Build'}
      onClick={onClick}
    >
      <HammerIcon />
    </button>
  )
}

function TravelerFace() {
  return (
    <svg viewBox="0 0 64 64">
      <rect width="64" height="64" fill="#9fd4ef" />
      <circle cx="32" cy="42" r="16" fill="#f3c7a8" />
      <path d="M16 34c1-14 31-16 33 1 1 6-2 10-6 8-4-6-16-6-20 0-4 2-8-2-7-9z" fill="#6b4632" />
      <circle cx="26" cy="40" r="1.7" fill="#2a241c" />
      <circle cx="38" cy="40" r="1.7" fill="#2a241c" />
      <path d="M28 47c2 2 6 2 8 0" fill="none" stroke="#c47a6a" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M20 54h24v10H20z" fill="#6e9a4a" />
    </svg>
  )
}

function HouseIcon() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path d="M6 14 L16 6 L26 14 V26 H6Z" fill="#f4e2c4" stroke="#4a2814" strokeWidth="1.6" />
      <path d="M4 15 L16 4 L28 15" fill="none" stroke="#c4493a" strokeWidth="2.4" strokeLinejoin="round" />
      <rect x="13" y="18" width="6" height="8" rx="1" fill="#8a552e" />
    </svg>
  )
}

function SignIcon() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <rect x="14.2" y="8" width="3.6" height="18" rx="1" fill="#f4e2c4" stroke="#4a2814" strokeWidth="1.2" />
      <path d="M8 8h14l-2 4 2 4H8z" fill="#f0c14a" stroke="#4a2814" strokeWidth="1.2" />
    </svg>
  )
}

function PeopleIcon() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="12" cy="12" r="4" fill="#f3c7a8" stroke="#4a2814" strokeWidth="1.2" />
      <circle cx="21" cy="13" r="3.2" fill="#f6d3b8" stroke="#4a2814" strokeWidth="1.2" />
      <path d="M5 25c1-5 5-7 7-7s6 2 7 7" fill="#7eb6e0" stroke="#4a2814" strokeWidth="1.2" />
      <path d="M16 25c.6-3.5 3-5 5.2-5 2.4 0 4.6 1.6 5.8 5" fill="#f0a0c0" stroke="#4a2814" strokeWidth="1.2" />
    </svg>
  )
}

function PackIcon() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <rect x="8" y="10" width="16" height="16" rx="3" fill="#c47a2a" stroke="#4a2814" strokeWidth="1.4" />
      <path d="M12 10v-2a4 4 0 0 1 8 0v2" fill="none" stroke="#4a2814" strokeWidth="1.6" />
      <rect x="14" y="15" width="4" height="5" rx="1" fill="#f4e2c4" />
    </svg>
  )
}

function MapIcon() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path d="M6 8l6-2 8 3 6-2v16l-6 2-8-3-6 2z" fill="#d7efb0" stroke="#4a2814" strokeWidth="1.3" />
      <path d="M12 6v16M20 9v16" fill="none" stroke="#8a552e" strokeWidth="1.2" />
      <circle cx="16" cy="15" r="2" fill="#c4493a" />
    </svg>
  )
}

function HammerIcon() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path d="M8 12h12l2 3-2 3H8l-2-3z" fill="#d7dde6" stroke="#2a241c" strokeWidth="1.3" />
      <rect x="14" y="15" width="3.2" height="12" rx="1" fill="#8a552e" stroke="#2a241c" strokeWidth="1" />
    </svg>
  )
}
