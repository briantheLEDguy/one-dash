import React, { useState } from 'react'
import { Download, Plus, FolderOpen, Save } from 'lucide-react'
import { useHeliosStore } from '../store/heliosStore'
import { useDeviceStore } from '../store/deviceStore'
import { useProjectStore } from '../store/projectStore'
import AddDeviceModal from './AddDeviceModal'
import ProjectManagerModal from './ProjectManagerModal'
import type { Project } from '../../../src/shared/types'

interface Props {
  updateBanner: 'available' | 'ready' | null
  onInstallUpdate: () => void
  onLoadProject: (project: Project) => void
  onSaveProject: () => void
}

export default function StatusBar({ updateBanner, onInstallUpdate, onLoadProject, onSaveProject }: Props) {
  const devices = useDeviceStore((s) => s.devices)
  const addDevice = useDeviceStore((s) => s.addDevice)
  const deviceStates = useHeliosStore((s) => s.deviceStates)
  const selectedIp = useHeliosStore((s) => s.selectedProcessorIp)
  const setPermission = useHeliosStore((s) => s.setPermission)
  const currentProject = useProjectStore((s) => s.currentProject)
  const isDirty = useProjectStore((s) => s.isDirty)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showProjectModal, setShowProjectModal] = useState(false)

  const totalAlerts = Object.values(deviceStates).reduce((sum, s) => sum + (s.alertsCount ?? 0), 0)
  const selectedState = selectedIp ? deviceStates[selectedIp] : null

  function handleAddDevice(ip: string, name: string, permission: 'read' | 'write') {
    window.api
      .addManualDevice(ip, name, permission)
      .then(() => {
        // IPC fires discovery:device event which calls addDevice in App.
        // Also set permission immediately in case the event is slow.
        addDevice({ ip, name, serial: '', version: '', role: 'manual', source: 'manual', permission })
        setPermission(ip, permission)
      })
      .catch(console.error)
    setShowAddModal(false)
  }

  return (
    <>
      <header
        className="app-drag-region"
        style={{
          height: 40,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          gap: 24,
          padding: '0 16px',
          backgroundColor: 'var(--color-helios-sidebar)',
          borderBottom: '1px solid var(--color-helios-border)',
          fontSize: 12
        }}
      >
        {/* macOS traffic light spacer */}
        <div style={{ width: 72, flexShrink: 0 }} />

        <span style={{ fontWeight: 700, color: 'var(--color-helios-text)', letterSpacing: '0.05em', fontSize: 13 }}>
          one-dash
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: 20, flex: 1 }}>
          <StatusPill label="PROCESSORS" value={String(devices.length)} />

          {selectedState && (
            <>
              <StatusPill label="INPUT" value={selectedState.input.input || '—'} />
              <StatusPill label="BRIGHTNESS" value={`${Math.round(selectedState.display.brightness)}%`} />
              <StatusPill label="CCT" value={`${selectedState.display.cct}K`} />
              {selectedState.display.blackout && (
                <StatusPill label="BLACKOUT" value="ON" variant="warning" />
              )}
              {selectedState.display.freeze && (
                <StatusPill label="FREEZE" value="ON" variant="warning" />
              )}
            </>
          )}

          {totalAlerts > 0 && (
            <StatusPill label="ALERTS" value={String(totalAlerts)} variant="error" />
          )}
        </div>

        {/* Project indicator */}
        <div className="app-no-drag" style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
          {isDirty && (
            <span style={{ color: 'var(--color-helios-warning)', fontSize: 16, lineHeight: 1 }} title="Unsaved changes">●</span>
          )}
          <button
            onClick={() => setShowProjectModal(true)}
            title="Manage projects"
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '3px 10px', borderRadius: 5,
              border: '1px solid var(--color-helios-border)',
              background: 'transparent', cursor: 'pointer',
              color: currentProject ? 'var(--color-helios-text)' : 'var(--color-helios-muted)',
              fontSize: 12, maxWidth: 200,
            }}
          >
            <FolderOpen size={13} style={{ flexShrink: 0, color: 'var(--color-helios-accent)' }} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {currentProject ? currentProject.name : 'No project'}
            </span>
          </button>
          {(currentProject || isDirty) && (
            <button
              onClick={onSaveProject}
              title="Save project"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 28, height: 28, borderRadius: 5,
                border: '1px solid var(--color-helios-border)',
                background: 'transparent', cursor: 'pointer',
                color: 'var(--color-helios-muted)',
              }}
            >
              <Save size={13} />
            </button>
          )}
        </div>

        {/* Right-side actions — not draggable */}
        <div className="app-no-drag" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {updateBanner && (
            <button
              onClick={updateBanner === 'ready' ? onInstallUpdate : undefined}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 10px',
                borderRadius: 4,
                background: 'rgba(255,107,53,0.15)',
                color: 'var(--color-helios-accent)',
                border: 'none',
                cursor: updateBanner === 'ready' ? 'pointer' : 'default',
                fontSize: 11,
                fontWeight: 500
              }}
            >
              <Download size={12} />
              {updateBanner === 'available' ? 'Update downloading…' : 'Restart to update'}
            </button>
          )}

          <button
            onClick={() => setShowAddModal(true)}
            title="Add device manually"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 28,
              height: 28,
              borderRadius: 6,
              border: '1px solid var(--color-helios-border)',
              background: 'transparent',
              color: 'var(--color-helios-muted)',
              cursor: 'pointer',
              transition: 'background 0.15s, color 0.15s, border-color 0.15s'
            }}
            onMouseEnter={(e) => {
              const btn = e.currentTarget as HTMLButtonElement
              btn.style.background = 'rgba(255,107,53,0.12)'
              btn.style.color = 'var(--color-helios-accent)'
              btn.style.borderColor = 'var(--color-helios-accent)'
            }}
            onMouseLeave={(e) => {
              const btn = e.currentTarget as HTMLButtonElement
              btn.style.background = 'transparent'
              btn.style.color = 'var(--color-helios-muted)'
              btn.style.borderColor = 'var(--color-helios-border)'
            }}
          >
            <Plus size={15} />
          </button>
        </div>
      </header>

      {showAddModal && (
        <AddDeviceModal
          onAdd={handleAddDevice}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {showProjectModal && (
        <ProjectManagerModal
          currentProject={currentProject}
          isDirty={isDirty}
          onLoad={onLoadProject}
          onSaveCurrent={onSaveProject}
          onClose={() => setShowProjectModal(false)}
        />
      )}
    </>
  )
}

function StatusPill({
  label,
  value,
  variant
}: {
  label: string
  value: string
  variant?: 'error' | 'warning' | 'success'
}) {
  const color =
    variant === 'error'
      ? 'var(--color-helios-error)'
      : variant === 'warning'
        ? 'var(--color-helios-warning)'
        : variant === 'success'
          ? 'var(--color-helios-success)'
          : 'var(--color-helios-text)'

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ color: 'var(--color-helios-muted)', fontSize: 10, fontWeight: 600, letterSpacing: '0.06em' }}>
        {label}
      </span>
      <span style={{ color, fontSize: 12, fontWeight: 500 }}>{value}</span>
    </div>
  )
}
