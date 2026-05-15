import React from 'react'
import {
  LayoutGrid,
  Scissors,
  SlidersHorizontal,
  Tv,
  Monitor,
  Camera,
  Cpu,
  Activity,
  Settings,
  Eye
} from 'lucide-react'
import { useHeliosStore } from '../store/heliosStore'

export type NavId = 'mapping' | 'seams' | 'adjustments' | 'input' | 'output' | 'camera' | 'devices' | 'health' | 'settings' | 'preview'

const NAV_ITEMS: Array<{ id: NavId; icon: React.ComponentType<{ size?: number }>; label: string; hidden?: boolean }> = [
  { id: 'mapping',     icon: LayoutGrid,         label: 'Mapping' },
  { id: 'seams',       icon: Scissors,           label: 'Seams',       hidden: true },
  { id: 'adjustments', icon: SlidersHorizontal,  label: 'Adjustments', hidden: true },
  { id: 'input',       icon: Tv,                 label: 'Input' },
  { id: 'output',      icon: Monitor,            label: 'Output' },
  { id: 'camera',      icon: Camera,             label: 'Camera' },
  { id: 'devices',     icon: Cpu,                label: 'Devices' },
  { id: 'health',      icon: Activity,           label: 'Health' },
  { id: 'settings',    icon: Settings,           label: 'Settings' },
  { id: 'preview',     icon: Eye,                label: 'Preview' }
]

interface SidebarProps {
  activeNav: NavId
  onNavChange: (id: NavId) => void
}

export default function Sidebar({ activeNav, onNavChange }: SidebarProps) {
  const deviceStates = useHeliosStore((s) => s.deviceStates)

  const totalAlerts = Object.values(deviceStates).reduce(
    (sum, s) => sum + (s.alertsCount ?? 0),
    0
  )

  return (
    <nav
      style={{
        width: 72,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        paddingTop: 12,
        paddingBottom: 12,
        gap: 2,
        backgroundColor: 'var(--color-helios-sidebar)',
        borderRight: '1px solid var(--color-helios-border)'
      }}
    >
      {NAV_ITEMS.filter((item) => !item.hidden).map(({ id, icon: Icon, label }) => {
        const isActive = activeNav === id
        const showBadge = id === 'health' && totalAlerts > 0

        return (
          <button
            key={id}
            onClick={() => onNavChange(id)}
            title={label}
            style={{
              width: 52,
              height: 52,
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              border: 'none',
              cursor: 'pointer',
              background: isActive ? 'rgba(255,107,53,0.15)' : 'transparent',
              color: isActive ? 'var(--color-helios-accent)' : 'var(--color-helios-muted)',
              transition: 'background 0.15s, color 0.15s',
              flexShrink: 0
            }}
            onMouseEnter={(e) => {
              if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.06)'
            }}
            onMouseLeave={(e) => {
              if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'
            }}
          >
            <Icon size={20} />
            {showBadge && (
              <span
                style={{
                  position: 'absolute',
                  top: 7,
                  right: 7,
                  minWidth: 16,
                  height: 16,
                  borderRadius: 8,
                  background: 'var(--color-helios-accent)',
                  color: '#fff',
                  fontSize: 10,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 3px',
                  lineHeight: 1
                }}
              >
                {totalAlerts > 99 ? '99+' : totalAlerts}
              </span>
            )}
          </button>
        )
      })}
    </nav>
  )
}
