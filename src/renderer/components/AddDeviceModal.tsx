import React, { useState, useRef, useEffect } from 'react'
import { X, Wifi, Eye, Pencil } from 'lucide-react'

interface Props {
  onAdd: (ip: string, name: string, permission: 'read' | 'write') => void
  onClose: () => void
}

function isValidHost(value: string): boolean {
  const trimmed = value.trim()
  if (!trimmed) return false
  // Strip optional :port suffix
  const portMatch = trimmed.match(/^(.+):(\d+)$/)
  const host = portMatch ? portMatch[1] : trimmed
  const port = portMatch ? parseInt(portMatch[2], 10) : null
  if (port !== null && (port < 1 || port > 65535)) return false
  // IPv4
  const ipv4 = /^(\d{1,3}\.){3}\d{1,3}$/.test(host)
  if (ipv4) return host.split('.').every((seg) => parseInt(seg, 10) <= 255)
  // Hostname (e.g. localhost, helios.local)
  return /^[a-zA-Z0-9]([a-zA-Z0-9\-\.]*[a-zA-Z0-9])?$/.test(host) || host === 'localhost'
}

export default function AddDeviceModal({ onAdd, onClose }: Props) {
  const [ip, setIp] = useState('')
  const [name, setName] = useState('')
  const [permission, setPermission] = useState<'read' | 'write'>('write')
  const [ipError, setIpError] = useState('')
  const ipRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    ipRef.current?.focus()
  }, [])

  function handleAdd() {
    const trimmedIp = ip.trim()
    if (!isValidHost(trimmedIp)) {
      setIpError('Enter a valid IP address or hostname')
      ipRef.current?.focus()
      return
    }
    onAdd(trimmedIp, name.trim() || trimmedIp, permission)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleAdd()
    if (e.key === 'Escape') onClose()
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 10px',
    background: 'var(--color-helios-bg)',
    border: '1px solid var(--color-helios-border)',
    borderRadius: 5,
    color: 'var(--color-helios-text)',
    fontSize: 13,
    outline: 'none',
    transition: 'border-color 0.15s'
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.07em',
    textTransform: 'uppercase',
    color: 'var(--color-helios-muted)',
    marginBottom: 5,
    display: 'block'
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        backdropFilter: 'blur(4px)'
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      onKeyDown={handleKeyDown}
    >
      <div
        style={{
          background: 'var(--color-helios-panel)',
          border: '1px solid var(--color-helios-border)',
          borderRadius: 10,
          padding: 24,
          width: 340,
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Wifi size={16} style={{ color: 'var(--color-helios-accent)' }} />
            <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--color-helios-text)' }}>
              Add Device
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--color-helios-muted)', padding: 4, borderRadius: 4,
              display: 'flex', alignItems: 'center'
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* IP Address */}
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>IP Address or Hostname</label>
          <input
            ref={ipRef}
            value={ip}
            onChange={(e) => { setIp(e.target.value); setIpError('') }}
            placeholder="192.168.1.100"
            style={{
              ...inputStyle,
              borderColor: ipError ? 'var(--color-helios-error)' : 'var(--color-helios-border)'
            }}
            onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = 'var(--color-helios-accent)' }}
            onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = ipError ? 'var(--color-helios-error)' : 'var(--color-helios-border)' }}
          />
          {ipError && (
            <div style={{ fontSize: 11, color: 'var(--color-helios-error)', marginTop: 4 }}>{ipError}</div>
          )}
        </div>

        {/* Name */}
        <div style={{ marginBottom: 18 }}>
          <label style={labelStyle}>Display Name <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Stage Left Wall"
            style={inputStyle}
            onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = 'var(--color-helios-accent)' }}
            onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = 'var(--color-helios-border)' }}
          />
        </div>

        {/* Permission */}
        <div style={{ marginBottom: 22 }}>
          <label style={labelStyle}>Permission</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <PermOption
              active={permission === 'write'}
              icon={<Pencil size={14} />}
              label="Read & Write"
              desc="Full control"
              onClick={() => setPermission('write')}
            />
            <PermOption
              active={permission === 'read'}
              icon={<Eye size={14} />}
              label="View Only"
              desc="Monitor only"
              onClick={() => setPermission('read')}
            />
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: '9px 16px', border: 'none', borderRadius: 6,
              background: 'var(--color-helios-border)', color: 'var(--color-helios-text)',
              fontSize: 13, cursor: 'pointer', fontWeight: 500
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleAdd}
            style={{
              flex: 2, padding: '9px 16px', border: 'none', borderRadius: 6,
              background: 'var(--color-helios-accent)', color: '#fff',
              fontSize: 13, cursor: 'pointer', fontWeight: 600,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
            }}
          >
            <Wifi size={14} />
            Connect
          </button>
        </div>
      </div>
    </div>
  )
}

function PermOption({
  active, icon, label, desc, onClick
}: {
  active: boolean
  icon: React.ReactNode
  label: string
  desc: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        padding: '10px 12px',
        border: `1px solid ${active ? 'var(--color-helios-accent)' : 'var(--color-helios-border)'}`,
        borderRadius: 6,
        background: active ? 'rgba(255,107,53,0.1)' : 'var(--color-helios-bg)',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: 4,
        transition: 'border-color 0.15s, background 0.15s',
        textAlign: 'left'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: active ? 'var(--color-helios-accent)' : 'var(--color-helios-muted)' }}>
        {icon}
        <span style={{ fontSize: 12, fontWeight: 600, color: active ? 'var(--color-helios-text)' : 'var(--color-helios-muted)' }}>
          {label}
        </span>
      </div>
      <span style={{ fontSize: 10, color: 'var(--color-helios-muted)', paddingLeft: 20 }}>{desc}</span>
    </button>
  )
}
