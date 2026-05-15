import React, { useState, useRef, useEffect } from 'react'
import {
  X, Lock, Eye, Wifi, WifiOff,
  AlertTriangle, CheckCircle, Camera, Plus, Trash2, Pencil, Check
} from 'lucide-react'
import type { NavId } from './Sidebar'
import {
  useHeliosStore,
  type Credentials,
  type GroupState,
  type TileReceiver,
  type HeliosDeviceState
} from '../store/heliosStore'
import { useDeviceStore } from '../store/deviceStore'
import {
  patchDisplay, patchInput, patchGroup, patchReceiver,
  createGroup, deleteGroup, getAll
} from '../api/heliosRest'

// ─── Shared micro-components ─────────────────────────────────────────────────

function SectionLabel({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, marginTop: 4 }}>
      <div style={{ color: 'var(--color-helios-muted)', fontSize: 10, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase' }}>
        {children}
      </div>
      {action}
    </div>
  )
}

function SliderRow({
  label, value, min, max, step = 1, unit = '', onChange
}: {
  label: string; value: number; min: number; max: number; step?: number; unit?: string
  onChange: (v: number) => void
}) {
  const [draft, setDraft] = useState(value)
  const isDragging = useRef(false)
  const pendingValue = useRef(value)
  const throttleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!isDragging.current) setDraft(value)
  }, [value])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = Number(e.target.value)
    isDragging.current = true
    setDraft(v)
    pendingValue.current = v
    if (!throttleTimer.current) {
      throttleTimer.current = setTimeout(() => {
        throttleTimer.current = null
        onChange(pendingValue.current)
      }, 100)
    }
  }

  function handlePointerUp() {
    isDragging.current = false
    if (throttleTimer.current) {
      clearTimeout(throttleTimer.current)
      throttleTimer.current = null
    }
    onChange(pendingValue.current)
  }

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 3 }}>
        <span style={{ color: 'var(--color-helios-muted)', fontSize: 11 }}>{label}</span>
        <span style={{ color: 'var(--color-helios-text)', fontSize: 12, fontWeight: 500 }}>
          {step < 1 ? draft.toFixed(1) : Math.round(draft)}{unit}
        </span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={draft}
        onChange={handleChange} onPointerUp={handlePointerUp}
        style={{ width: '100%', accentColor: 'var(--color-helios-accent)', cursor: 'pointer' }}
      />
    </div>
  )
}

function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
      <span style={{ color: 'var(--color-helios-muted)', fontSize: 12 }}>{label}</span>
      <button
        onClick={() => onChange(!value)}
        style={{
          width: 38, height: 20, borderRadius: 10,
          background: value ? 'var(--color-helios-accent)' : 'var(--color-helios-border)',
          border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s'
        }}
      >
        <span style={{
          position: 'absolute', top: 3, left: value ? 19 : 3,
          width: 14, height: 14, borderRadius: 7, background: '#fff', transition: 'left 0.2s'
        }} />
      </button>
    </div>
  )
}

function InfoRow({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid var(--color-helios-border)' }}>
      <span style={{ color: 'var(--color-helios-muted)', fontSize: 12 }}>{label}</span>
      <span style={{ color: highlight ? 'var(--color-helios-warning)' : 'var(--color-helios-text)', fontSize: 12, fontWeight: highlight ? 600 : 400 }}>{value}</span>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ flex: 1, textAlign: 'center', padding: '8px 4px', background: 'var(--color-helios-bg)', borderRadius: 6, border: '1px solid var(--color-helios-border)' }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-helios-text)' }}>{value}</div>
      <div style={{ fontSize: 9, color: 'var(--color-helios-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>{label}</div>
    </div>
  )
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      <span style={{ color: 'var(--color-helios-muted)', fontSize: 13 }}>{children}</span>
    </div>
  )
}

function IconBtn({ children, onClick, title, danger }: { children: React.ReactNode; onClick: () => void; title?: string; danger?: boolean }) {
  return (
    <button
      onClick={onClick} title={title}
      style={{ background: 'none', border: 'none', cursor: 'pointer', color: danger ? '#ff6464' : 'var(--color-helios-muted)', padding: 4, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = danger ? '#ff9090' : 'var(--color-helios-text)')}
      onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = danger ? '#ff6464' : 'var(--color-helios-muted)')}
    >
      {children}
    </button>
  )
}

const selectStyle: React.CSSProperties = {
  width: '100%', padding: '5px 8px',
  background: 'var(--color-helios-bg)',
  border: '1px solid var(--color-helios-border)',
  borderRadius: 4, color: 'var(--color-helios-text)', fontSize: 12
}

const numInputStyle: React.CSSProperties = {
  width: 60, padding: '4px 6px',
  background: 'var(--color-helios-bg)',
  border: '1px solid var(--color-helios-border)',
  borderRadius: 4, color: 'var(--color-helios-text)', fontSize: 12
}

// ─── Selected Tile Panel ──────────────────────────────────────────────────────

function TilePanel({
  tile, groups, ip, creds
}: {
  tile: TileReceiver; groups: GroupState[]; ip: string; creds: Credentials | undefined
}) {
  const updateReceiver = useHeliosStore((s) => s.updateReceiver)
  const [draftX, setDraftX] = useState(tile.x)
  const [draftY, setDraftY] = useState(tile.y)

  useEffect(() => { setDraftX(tile.x) }, [tile.x])
  useEffect(() => { setDraftY(tile.y) }, [tile.y])

  async function commitPosition(field: 'x' | 'y', value: number) {
    try {
      await patchReceiver(ip, creds, tile.id, { [field]: value })
      updateReceiver(ip, tile.id, { [field]: value })
    } catch (e) { console.error('Receiver patch failed:', e) }
  }

  async function changeGroup(groupId: number) {
    try {
      await patchReceiver(ip, creds, tile.id, { groupId })
      updateReceiver(ip, tile.id, { groupId })
    } catch (e) { console.error('Receiver patch failed:', e) }
  }

  const statusColor = tile.info?.connected === false ? '#ff6464' : tile.info?.connected ? '#48c878' : 'var(--color-helios-muted)'

  return (
    <div style={{ marginBottom: 14, padding: '10px', borderRadius: 6, border: '1px solid var(--color-helios-accent)', background: 'rgba(255,107,53,0.06)' }}>
      <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--color-helios-text)', marginBottom: 6 }}>
        {tile.info?.name || tile.id}
      </div>

      {tile.info?.pixelsW != null && (
        <InfoRow label="Pixels" value={`${tile.info.pixelsW} × ${tile.info.pixelsH}`} />
      )}
      <InfoRow label="Canvas size" value={`${tile.width} × ${tile.height}`} />
      {tile.info?.connected != null && (
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid var(--color-helios-border)' }}>
          <span style={{ color: 'var(--color-helios-muted)', fontSize: 12 }}>Status</span>
          <span style={{ color: statusColor, fontSize: 12, fontWeight: 600 }}>
            {tile.info.connected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      )}

      <div style={{ marginTop: 8, marginBottom: 6 }}>
        <div style={{ color: 'var(--color-helios-muted)', fontSize: 10, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 6 }}>Position</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <label style={{ color: 'var(--color-helios-muted)', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
            X
            <input
              type="number" value={draftX} style={numInputStyle}
              onChange={(e) => setDraftX(Number(e.target.value))}
              onBlur={() => commitPosition('x', draftX)}
              onKeyDown={(e) => e.key === 'Enter' && (e.currentTarget as HTMLInputElement).blur()}
            />
          </label>
          <label style={{ color: 'var(--color-helios-muted)', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
            Y
            <input
              type="number" value={draftY} style={numInputStyle}
              onChange={(e) => setDraftY(Number(e.target.value))}
              onBlur={() => commitPosition('y', draftY)}
              onKeyDown={(e) => e.key === 'Enter' && (e.currentTarget as HTMLInputElement).blur()}
            />
          </label>
        </div>
      </div>

      <div>
        <div style={{ color: 'var(--color-helios-muted)', fontSize: 10, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 4 }}>Group</div>
        <select
          value={tile.groupId}
          onChange={(e) => changeGroup(Number(e.target.value))}
          style={selectStyle}
        >
          <option value={-1}>— No group —</option>
          {groups.map((g) => (
            <option key={g.key} value={g.id}>{g.name || `Group ${g.id}`}</option>
          ))}
        </select>
      </div>
    </div>
  )
}

// ─── Group Card ───────────────────────────────────────────────────────────────

function GroupCard({
  group, ip, creds, onDeleted
}: {
  group: GroupState; ip: string; creds: Credentials | undefined
  onDeleted: (key: string) => void
}) {
  const updateGroup = useHeliosStore((s) => s.updateGroup)
  const [isEditing, setIsEditing] = useState(false)
  const [draftName, setDraftName] = useState(group.name)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const nameInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { setDraftName(group.name) }, [group.name])

  useEffect(() => {
    if (isEditing) nameInputRef.current?.focus()
  }, [isEditing])

  async function tryPatch(fn: () => Promise<void>) {
    try { await fn() } catch (e) { console.error('Patch failed:', e) }
  }

  async function commitName() {
    setIsEditing(false)
    const trimmed = draftName.trim()
    if (trimmed === group.name) return
    await tryPatch(async () => {
      await patchGroup(ip, creds, group.key, { name: trimmed })
      updateGroup(ip, group.key, { name: trimmed })
    })
  }

  async function handleDelete() {
    if (!confirmDelete) { setConfirmDelete(true); return }
    try {
      await deleteGroup(ip, creds, group.key)
      onDeleted(group.key)
    } catch (e) { console.error('Delete failed:', e) }
    setConfirmDelete(false)
  }

  return (
    <div style={{ marginBottom: 14, paddingBottom: 12, borderBottom: '1px solid var(--color-helios-border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        {isEditing ? (
          <input
            ref={nameInputRef}
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            onBlur={commitName}
            onKeyDown={(e) => { if (e.key === 'Enter') commitName(); if (e.key === 'Escape') { setDraftName(group.name); setIsEditing(false) } }}
            style={{ ...numInputStyle, width: '100%', marginRight: 4 }}
          />
        ) : (
          <span style={{ fontWeight: 600, fontSize: 12, color: 'var(--color-helios-text)', flex: 1, cursor: 'pointer' }} onClick={() => setIsEditing(true)}>
            {group.name || `Group ${group.id}`}
          </span>
        )}
        <div style={{ display: 'flex', gap: 0 }}>
          {isEditing ? (
            <IconBtn onClick={commitName} title="Save name"><Check size={13} /></IconBtn>
          ) : (
            <IconBtn onClick={() => setIsEditing(true)} title="Rename"><Pencil size={12} /></IconBtn>
          )}
          <IconBtn
            onClick={handleDelete}
            title={confirmDelete ? 'Click again to confirm delete' : 'Delete group'}
            danger
          >
            <Trash2 size={12} />
          </IconBtn>
        </div>
      </div>
      {confirmDelete && (
        <div style={{ fontSize: 11, color: '#ff6464', marginBottom: 6 }}>
          Click delete again to confirm
        </div>
      )}
      <ToggleRow
        label="Blackout"
        value={group.blackout}
        onChange={(v) => tryPatch(async () => {
          await patchGroup(ip, creds, group.key, { blackout: v })
          updateGroup(ip, group.key, { blackout: v })
        })}
      />
      <SliderRow label="Red" value={Math.round(group.gains.r * 100)} min={0} max={100} unit="%"
        onChange={(v) => tryPatch(async () => {
          const gains = { ...group.gains, r: v / 100 }
          await patchGroup(ip, creds, group.key, { gains })
          updateGroup(ip, group.key, { gains })
        })} />
      <SliderRow label="Green" value={Math.round(group.gains.g * 100)} min={0} max={100} unit="%"
        onChange={(v) => tryPatch(async () => {
          const gains = { ...group.gains, g: v / 100 }
          await patchGroup(ip, creds, group.key, { gains })
          updateGroup(ip, group.key, { gains })
        })} />
      <SliderRow label="Blue" value={Math.round(group.gains.b * 100)} min={0} max={100} unit="%"
        onChange={(v) => tryPatch(async () => {
          const gains = { ...group.gains, b: v / 100 }
          await patchGroup(ip, creds, group.key, { gains })
          updateGroup(ip, group.key, { gains })
        })} />
      <SliderRow label="Intensity" value={Math.round(group.gains.i * 100)} min={0} max={100} unit="%"
        onChange={(v) => tryPatch(async () => {
          const gains = { ...group.gains, i: v / 100 }
          await patchGroup(ip, creds, group.key, { gains })
          updateGroup(ip, group.key, { gains })
        })} />
    </div>
  )
}

// ─── Mapping: Groups & layout overview ───────────────────────────────────────

function MappingSection({ state, ip, creds }: { state: HeliosDeviceState; ip: string; creds: Credentials | undefined }) {
  const selectedTileId = useHeliosStore((s) => s.selectedTileId)
  const setDeviceState = useHeliosStore((s) => s.setDeviceState)

  const recs = state.receivers
  const canvasW = recs.length > 0 ? Math.max(...recs.map((r) => r.x + r.width)) - Math.min(...recs.map((r) => r.x)) : 0
  const canvasH = recs.length > 0 ? Math.max(...recs.map((r) => r.y + r.height)) - Math.min(...recs.map((r) => r.y)) : 0

  const selectedTile = selectedTileId ? recs.find((r) => r.id === selectedTileId) ?? null : null

  async function handleCreateGroup() {
    try {
      await createGroup(ip, creds, 'New Group', state.groups.map((g) => g.key))
      const fresh = await getAll(ip, creds)
      setDeviceState(ip, { groups: fresh.groups, receivers: fresh.receivers })
    } catch (e) { console.error('Create group failed:', e) }
  }

  async function handleGroupDeleted() {
    try {
      const fresh = await getAll(ip, creds)
      setDeviceState(ip, { groups: fresh.groups, receivers: fresh.receivers })
    } catch (e) { console.error('Refresh after delete failed:', e) }
  }

  return (
    <>
      <SectionLabel>Canvas</SectionLabel>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <Stat label="Tiles" value={String(recs.length)} />
        <Stat label="Groups" value={String(state.groups.length)} />
        <Stat label="W×H" value={recs.length > 0 ? `${canvasW}×${canvasH}` : '—'} />
      </div>

      {selectedTile && (
        <>
          <SectionLabel>Selected Tile</SectionLabel>
          <TilePanel tile={selectedTile} groups={state.groups} ip={ip} creds={creds} />
        </>
      )}

      <SectionLabel
        action={
          <button
            onClick={handleCreateGroup}
            style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '2px 7px', borderRadius: 4, border: '1px solid var(--color-helios-border)', background: 'var(--color-helios-bg)', color: 'var(--color-helios-muted)', fontSize: 10, cursor: 'pointer', fontWeight: 600 }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-helios-text)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-helios-muted)')}
          >
            <Plus size={11} /> Group
          </button>
        }
      >
        Groups
      </SectionLabel>

      {state.groups.length === 0 && (
        <div style={{ color: 'var(--color-helios-muted)', fontSize: 12, fontStyle: 'italic', marginBottom: 8 }}>
          No groups — click + Group to create one
        </div>
      )}

      {state.groups.map((group) => (
        <GroupCard
          key={group.key}
          group={group}
          ip={ip}
          creds={creds}
          onDeleted={handleGroupDeleted}
        />
      ))}
    </>
  )
}

// ─── Input ───────────────────────────────────────────────────────────────────

const TEST_PATTERN_TYPES = [
  { value: 'solid_white', label: 'Solid White' },
  { value: 'solid_black', label: 'Solid Black' },
  { value: 'solid_red', label: 'Solid Red' },
  { value: 'solid_green', label: 'Solid Green' },
  { value: 'solid_blue', label: 'Solid Blue' },
  { value: 'gradient_h', label: 'Gradient H' },
  { value: 'gradient_v', label: 'Gradient V' },
  { value: 'ramp_h', label: 'Ramp H' },
  { value: 'ramp_v', label: 'Ramp V' },
  { value: 'checker', label: 'Checkerboard' },
  { value: 'color_bars', label: 'Color Bars' },
  { value: 'grid', label: 'Grid' },
]

function InputSection({ state, ip, creds }: { state: HeliosDeviceState; ip: string; creds: Credentials | undefined }) {
  const updateInput = useHeliosStore((s) => s.updateInput)

  async function tryPatch(fn: () => Promise<void>) {
    try { await fn() } catch (e) { console.error('Patch failed:', e) }
  }

  const inputs = Object.entries(state.input.inputs)
  const tp = state.input.testPattern

  const currentType = tp.type ?? ''
  const knownTypes = TEST_PATTERN_TYPES.map((t) => t.value)
  const typeOptions = knownTypes.includes(currentType) || currentType === ''
    ? TEST_PATTERN_TYPES
    : [{ value: currentType, label: currentType }, ...TEST_PATTERN_TYPES]

  return (
    <>
      <SectionLabel>Active Input</SectionLabel>
      <select
        value={state.input.input}
        onChange={(e) => tryPatch(async () => {
          await patchInput(ip, creds, { input: e.target.value })
          updateInput(ip, { input: e.target.value })
        })}
        style={{ ...selectStyle, marginBottom: 16 }}
      >
        {inputs.map(([key, inp]) => (
          <option key={key} value={key}>
            {inp.name}{inp.resolution ? ` — ${inp.resolution}` : ''}{!inp.valid ? ' (no signal)' : ''}
          </option>
        ))}
      </select>

      {inputs.length > 0 && (
        <>
          <SectionLabel>Signal Status</SectionLabel>
          <div style={{ marginBottom: 14 }}>
            {inputs.map(([key, inp]) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--color-helios-border)' }}>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--color-helios-text)', fontWeight: key === state.input.input ? 600 : 400 }}>{inp.name}</div>
                  {inp.resolution && <div style={{ fontSize: 10, color: 'var(--color-helios-muted)', marginTop: 1 }}>{inp.resolution}</div>}
                </div>
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
                  background: inp.valid ? 'rgba(72,200,120,0.15)' : 'rgba(255,100,100,0.12)',
                  color: inp.valid ? '#48c878' : '#ff6464'
                }}>
                  {inp.valid ? 'LIVE' : 'NO SIG'}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      <SectionLabel>Test Pattern</SectionLabel>
      <ToggleRow
        label="Enable"
        value={tp.enabled}
        onChange={(v) => tryPatch(async () => {
          await patchInput(ip, creds, { testPattern: { ...tp, enabled: v } })
          updateInput(ip, { testPattern: { ...tp, enabled: v } })
        })}
      />

      {tp.enabled && (
        <>
          <div style={{ marginBottom: 10 }}>
            <div style={{ color: 'var(--color-helios-muted)', fontSize: 11, marginBottom: 4 }}>Pattern Type</div>
            <select
              value={currentType}
              onChange={(e) => tryPatch(async () => {
                const newTp = { ...tp, type: e.target.value }
                await patchInput(ip, creds, { testPattern: newTp })
                updateInput(ip, { testPattern: newTp })
              })}
              style={selectStyle}
            >
              {currentType === '' && <option value="">— Select type —</option>}
              {typeOptions.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          {typeof tp.motion === 'boolean' && (
            <ToggleRow
              label="Motion"
              value={tp.motion!}
              onChange={(v) => tryPatch(async () => {
                const newTp = { ...tp, motion: v }
                await patchInput(ip, creds, { testPattern: newTp })
                updateInput(ip, { testPattern: newTp })
              })}
            />
          )}
        </>
      )}
    </>
  )
}

// ─── Output ──────────────────────────────────────────────────────────────────

function OutputSection({ state, ip, creds }: { state: HeliosDeviceState; ip: string; creds: Credentials | undefined }) {
  const updateDisplay = useHeliosStore((s) => s.updateDisplay)

  async function tryPatch(patch: Parameters<typeof patchDisplay>[2]) {
    try {
      await patchDisplay(ip, creds, patch)
      updateDisplay(ip, patch)
    } catch (e) { console.error('Patch failed:', e) }
  }

  return (
    <>
      <SectionLabel>Brightness &amp; Color</SectionLabel>
      <SliderRow label="Brightness" value={state.display.brightness} min={0} max={100} unit="%"
        onChange={(v) => tryPatch({ brightness: v })} />
      <SliderRow label="Gamma" value={state.display.gamma} min={1} max={4} step={0.1}
        onChange={(v) => tryPatch({ gamma: v })} />
      <SliderRow label="Color Temp" value={state.display.cct} min={2000} max={10000} step={100} unit="K"
        onChange={(v) => tryPatch({ cct: v })} />

      <SectionLabel>Output Control</SectionLabel>
      <ToggleRow
        label="Blackout"
        value={state.display.blackout}
        onChange={(v) => tryPatch({ blackout: v })}
      />
      <ToggleRow
        label="Freeze"
        value={state.display.freeze}
        onChange={(v) => tryPatch({ freeze: v })}
      />
    </>
  )
}

// ─── Camera ──────────────────────────────────────────────────────────────────

function CameraSection({ ip }: { ip: string | null }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12, color: 'var(--color-helios-muted)', textAlign: 'center', padding: '0 20px' }}>
      <Camera size={32} style={{ opacity: 0.3 }} />
      <div style={{ fontSize: 12, lineHeight: 1.5 }}>
        Camera-based calibration is available through the HELIOS web interface
        {ip ? <> at <span style={{ color: 'var(--color-helios-accent)' }}>http://{ip}</span></> : ''}.
      </div>
    </div>
  )
}

// ─── Devices ─────────────────────────────────────────────────────────────────

function DevicesSection() {
  const devices = useDeviceStore((s) => s.devices)
  const deviceStates = useHeliosStore((s) => s.deviceStates)
  const selectedIp = useHeliosStore((s) => s.selectedProcessorIp)
  const selectProcessor = useHeliosStore((s) => s.selectProcessor)

  if (devices.length === 0) {
    return <EmptyState>No devices found</EmptyState>
  }

  return (
    <div style={{ padding: 12 }}>
      <SectionLabel>Processors ({devices.length})</SectionLabel>
      {devices.map((device) => {
        const ds = deviceStates[device.ip]
        const isSelected = device.ip === selectedIp
        const isLoading = ds?.loading ?? true
        const hasError = !!ds?.error
        const alerts = ds?.alertsCount ?? 0

        return (
          <button
            key={device.ip}
            onClick={() => selectProcessor(isSelected ? null : device.ip)}
            style={{
              width: '100%', textAlign: 'left', marginBottom: 6, padding: '8px 10px',
              borderRadius: 6, cursor: 'pointer', border: 'none',
              background: isSelected ? 'rgba(255,107,53,0.12)' : 'var(--color-helios-bg)',
              outline: isSelected ? '1px solid var(--color-helios-accent)' : '1px solid var(--color-helios-border)',
              borderLeft: `3px solid ${isSelected ? 'var(--color-helios-accent)' : 'transparent'}`
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 600, fontSize: 12, color: 'var(--color-helios-text)' }}>
                {device.name || device.ip}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {alerts > 0 && (
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 5px', borderRadius: 10, background: 'var(--color-helios-accent)', color: '#fff' }}>
                    {alerts}
                  </span>
                )}
                {hasError
                  ? <WifiOff size={12} style={{ color: '#ff6464' }} />
                  : isLoading
                    ? <span style={{ fontSize: 10, color: 'var(--color-helios-muted)' }}>…</span>
                    : <Wifi size={12} style={{ color: '#48c878' }} />
                }
              </div>
            </div>
            <div style={{ fontSize: 10, color: 'var(--color-helios-muted)', marginTop: 2 }}>{device.ip}</div>
            {hasError && <div style={{ fontSize: 10, color: '#ff6464', marginTop: 2 }}>{ds!.error}</div>}
            {ds && !ds.loading && !hasError && (
              <div style={{ fontSize: 10, color: 'var(--color-helios-muted)', marginTop: 2 }}>
                {ds.receivers.length} tile{ds.receivers.length !== 1 ? 's' : ''} · {ds.groups.length} group{ds.groups.length !== 1 ? 's' : ''}
              </div>
            )}
          </button>
        )
      })}
    </div>
  )
}

// ─── Health ──────────────────────────────────────────────────────────────────

function HealthSection() {
  const devices = useDeviceStore((s) => s.devices)
  const deviceStates = useHeliosStore((s) => s.deviceStates)

  const totalAlerts = Object.values(deviceStates).reduce((sum, ds) => sum + (ds.alertsCount ?? 0), 0)
  const errorCount = Object.values(deviceStates).filter((ds) => ds.error).length

  if (devices.length === 0) return <EmptyState>No devices connected</EmptyState>

  return (
    <div style={{ padding: 12 }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <Stat label="Devices" value={String(devices.length)} />
        <Stat label="Alerts" value={String(totalAlerts)} />
        {errorCount > 0 && <Stat label="Errors" value={String(errorCount)} />}
      </div>

      {devices.map((device) => {
        const ds = deviceStates[device.ip]
        if (!ds) return null
        const alerts = Object.entries(ds.sysAlerts ?? {})
        const hasError = !!ds.error

        return (
          <div key={device.ip} style={{ marginBottom: 10, padding: '8px 10px', borderRadius: 6, border: '1px solid var(--color-helios-border)', background: 'var(--color-helios-bg)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: alerts.length > 0 || hasError ? 8 : 0 }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--color-helios-text)' }}>{device.name || device.ip}</div>
                <div style={{ fontSize: 10, color: 'var(--color-helios-muted)' }}>{device.ip}</div>
              </div>
              {hasError
                ? <AlertTriangle size={16} style={{ color: '#ff6464' }} />
                : alerts.length > 0
                  ? <AlertTriangle size={16} style={{ color: 'var(--color-helios-warning)' }} />
                  : <CheckCircle size={16} style={{ color: '#48c878' }} />
              }
            </div>
            {hasError && <div style={{ fontSize: 11, color: '#ff6464' }}>{ds.error}</div>}
            {alerts.map(([key, alert]) => (
              <div key={key} style={{ fontSize: 11, padding: '4px 0', borderTop: '1px solid var(--color-helios-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: alert.severity >= 3 ? '#ff6464' : 'var(--color-helios-warning)' }}>{alert.brief}</span>
                {alert.count > 1 && <span style={{ fontSize: 10, color: 'var(--color-helios-muted)' }}>×{alert.count}</span>}
              </div>
            ))}
            {!hasError && alerts.length === 0 && (
              <div style={{ fontSize: 11, color: 'var(--color-helios-muted)' }}>No active alerts</div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Settings ────────────────────────────────────────────────────────────────

function SettingsSection({ ip }: { ip: string | null }) {
  const devices = useDeviceStore((s) => s.devices)
  const device = devices.find((d) => d.ip === ip)

  return (
    <div style={{ padding: 12 }}>
      {ip && device ? (
        <>
          <SectionLabel>Processor Info</SectionLabel>
          <InfoRow label="Name" value={device.name || '—'} />
          <InfoRow label="IP Address" value={ip} />
          {device.serial && <InfoRow label="Serial" value={device.serial} />}
          {device.version && <InfoRow label="Firmware" value={device.version} />}
          <InfoRow label="Source" value={device.source} />
          <InfoRow label="Permission" value={device.permission} />
          <div style={{ marginTop: 12, padding: '8px 10px', borderRadius: 6, background: 'var(--color-helios-bg)', border: '1px solid var(--color-helios-border)', fontSize: 11, color: 'var(--color-helios-muted)', lineHeight: 1.5 }}>
            Full system settings are available through the HELIOS web interface at{' '}
            <span style={{ color: 'var(--color-helios-accent)' }}>http://{ip}</span>
          </div>
        </>
      ) : (
        <div style={{ color: 'var(--color-helios-muted)', fontSize: 12, fontStyle: 'italic', textAlign: 'center', marginTop: 20 }}>
          Select a processor to view its settings
        </div>
      )}
    </div>
  )
}

// ─── Preview ─────────────────────────────────────────────────────────────────

function PreviewSection() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12, color: 'var(--color-helios-muted)', textAlign: 'center', padding: '0 20px' }}>
      <Eye size={32} style={{ opacity: 0.3 }} />
      <div style={{ fontSize: 12, lineHeight: 1.5 }}>
        Live preview is shown directly in the canvas when connected. The background image updates every 2 seconds.
      </div>
    </div>
  )
}

// ─── Auth Modal ───────────────────────────────────────────────────────────────

function AuthModal({
  ip, current, onSave, onClose
}: {
  ip: string; current: Credentials | undefined
  onSave: (c: Credentials) => void; onClose: () => void
}) {
  const [username, setUsername] = useState(current?.username ?? '')
  const [password, setPassword] = useState(current?.password ?? '')

  const inputStyle: React.CSSProperties = {
    width: '100%', marginBottom: 8, padding: '6px 10px',
    background: 'var(--color-helios-bg)',
    border: '1px solid var(--color-helios-border)',
    borderRadius: 4, color: 'var(--color-helios-text)', fontSize: 12
  }

  return (
    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
      <div style={{ background: 'var(--color-helios-panel)', border: '1px solid var(--color-helios-border)', borderRadius: 8, padding: 20, width: 220 }}>
        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 12, color: 'var(--color-helios-text)' }}>
          Credentials — {ip}
        </div>
        <input placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} style={inputStyle} />
        <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} style={inputStyle} />
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '6px 12px', border: 'none', borderRadius: 4, background: 'var(--color-helios-border)', color: 'var(--color-helios-text)', fontSize: 12, cursor: 'pointer' }}>Cancel</button>
          <button onClick={() => onSave({ username, password })} style={{ flex: 1, padding: '6px 12px', border: 'none', borderRadius: 4, background: 'var(--color-helios-accent)', color: '#fff', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>Save</button>
        </div>
      </div>
    </div>
  )
}

// ─── Nav section metadata ─────────────────────────────────────────────────────

const NAV_LABELS: Record<NavId, string> = {
  mapping: 'Mapping',
  seams: 'Seams',
  adjustments: 'Adjustments',
  input: 'Input',
  output: 'Output',
  camera: 'Camera',
  devices: 'Devices',
  health: 'Health',
  settings: 'Settings',
  preview: 'Preview'
}

const PROCESSOR_SECTIONS = new Set<NavId>(['mapping', 'input', 'output'])

// ─── Main Component ───────────────────────────────────────────────────────────

export default function RightPanel({ activeNav }: { activeNav: NavId }) {
  const selectedIp = useHeliosStore((s) => s.selectedProcessorIp)
  const selectProcessor = useHeliosStore((s) => s.selectProcessor)
  const deviceStates = useHeliosStore((s) => s.deviceStates)
  const credentials = useHeliosStore((s) => s.credentials)
  const permissions = useHeliosStore((s) => s.permissions)
  const setCredentials = useHeliosStore((s) => s.setCredentials)
  const [showAuth, setShowAuth] = useState(false)

  const state = selectedIp ? deviceStates[selectedIp] : null
  const creds = selectedIp ? credentials[selectedIp] : undefined
  const isReadOnly = selectedIp ? (permissions[selectedIp] ?? 'write') === 'read' : false
  const isProcessorSection = PROCESSOR_SECTIONS.has(activeNav)
  const device = useDeviceStore((s) => s.devices.find((d) => d.ip === selectedIp))

  const panelStyle: React.CSSProperties = {
    width: 288,
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: 'var(--color-helios-panel)',
    borderLeft: '1px solid var(--color-helios-border)',
    position: 'relative',
    overflow: 'hidden'
  }

  const showHeader = isProcessorSection && !!selectedIp

  function renderContent() {
    if (isProcessorSection && (!selectedIp || !state)) {
      return <EmptyState>Select a processor</EmptyState>
    }

    switch (activeNav) {
      case 'mapping':  return <MappingSection state={state!} ip={selectedIp!} creds={creds} />
      case 'input':    return <InputSection state={state!} ip={selectedIp!} creds={creds} />
      case 'output':   return <OutputSection state={state!} ip={selectedIp!} creds={creds} />
      case 'camera':   return <CameraSection ip={selectedIp} />
      case 'devices':  return <DevicesSection />
      case 'health':   return <HealthSection />
      case 'settings': return <SettingsSection ip={selectedIp} />
      case 'preview':  return <PreviewSection />
      default:         return null
    }
  }

  return (
    <aside style={panelStyle}>
      {showHeader && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderBottom: '1px solid var(--color-helios-border)', flexShrink: 0 }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--color-helios-text)' }}>
              {device?.name ?? selectedIp}
            </div>
            <div style={{ fontSize: 11, color: 'var(--color-helios-muted)', marginTop: 1 }}>
              {NAV_LABELS[activeNav]} · {selectedIp}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {isReadOnly && (
              <span title="View only" style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '2px 6px', borderRadius: 4, background: 'rgba(240,168,48,0.15)', color: 'var(--color-helios-warning)', fontSize: 10, fontWeight: 600, letterSpacing: '0.05em' }}>
                <Eye size={11} /> VIEW ONLY
              </span>
            )}
            <IconBtn onClick={() => setShowAuth(true)} title="Set credentials"><Lock size={14} /></IconBtn>
            <IconBtn onClick={() => selectProcessor(null)} title="Deselect"><X size={14} /></IconBtn>
          </div>
        </div>
      )}

      {!isProcessorSection && (
        <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--color-helios-border)', flexShrink: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--color-helios-text)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {NAV_LABELS[activeNav]}
          </div>
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
        {isReadOnly && isProcessorSection && selectedIp && state && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 5, cursor: 'not-allowed' }} title="View only — cannot change settings" />
        )}
        <div style={{ opacity: isReadOnly && isProcessorSection ? 0.45 : 1, pointerEvents: isReadOnly && isProcessorSection ? 'none' : 'auto', padding: isProcessorSection ? 12 : 0, height: '100%' }}>
          {renderContent()}
        </div>
      </div>

      {showAuth && selectedIp && (
        <AuthModal
          ip={selectedIp}
          current={creds}
          onSave={(c) => { setCredentials(selectedIp, c); setShowAuth(false) }}
          onClose={() => setShowAuth(false)}
        />
      )}
    </aside>
  )
}
