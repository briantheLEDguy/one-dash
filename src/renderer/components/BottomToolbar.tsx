import React from 'react'

export default function BottomToolbar() {
  return (
    <div
      style={{
        height: 44,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        backgroundColor: 'var(--color-helios-sidebar)',
        borderTop: '1px solid var(--color-helios-border)',
        color: 'var(--color-helios-muted)',
        fontSize: 12,
        gap: 8
      }}
    >
      <span>Tile alignment tools — coming soon</span>
    </div>
  )
}
