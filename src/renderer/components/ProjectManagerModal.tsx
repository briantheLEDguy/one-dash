import React, { useState, useEffect, useRef } from 'react'
import { X, FolderOpen, Save, Trash2, Download, Upload, Plus, Pencil, Check } from 'lucide-react'
import type { Project } from '../../../src/shared/types'

interface Props {
  currentProject: Project | null
  isDirty: boolean
  onLoad: (project: Project) => void
  onSaveCurrent: () => void
  onClose: () => void
}

export default function ProjectManagerModal({
  currentProject,
  isDirty,
  onLoad,
  onSaveCurrent,
  onClose,
}: Props) {
  const [projects, setProjects] = useState<Project[]>([])
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const renameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    window.api.listProjects().then(setProjects).catch(console.error)
  }, [])

  useEffect(() => {
    if (renamingId) renameRef.current?.focus()
  }, [renamingId])

  async function handleImport() {
    const imported = await window.api.importProject().catch(console.error)
    if (!imported) return
    setProjects((prev) => {
      const idx = prev.findIndex((p) => p.id === imported.id)
      return idx >= 0
        ? prev.map((p, i) => (i === idx ? imported : p))
        : [imported, ...prev]
    })
  }

  async function handleExport(project: Project) {
    await window.api.exportProject(project).catch(console.error)
  }

  async function handleDelete(id: string) {
    await window.api.deleteProject(id).catch(console.error)
    setProjects((prev) => prev.filter((p) => p.id !== id))
    // If we deleted the current project, we don't clear it from the app —
    // the user still has it open, just unlinked from disk.
  }

  async function commitRename(project: Project) {
    const name = renameValue.trim()
    if (!name || name === project.name) {
      setRenamingId(null)
      return
    }
    const updated = await window.api.saveProject({ ...project, name }).catch(console.error)
    if (!updated) return
    setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
    setRenamingId(null)
    // If this is the current project, let the parent know via onLoad so it syncs.
    if (currentProject?.id === updated.id) onLoad(updated)
  }

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.65)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2000,
    backdropFilter: 'blur(4px)',
  }

  const cardStyle: React.CSSProperties = {
    background: 'var(--color-helios-panel)',
    border: '1px solid var(--color-helios-border)',
    borderRadius: 12,
    width: 480,
    maxHeight: '80vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 24px 72px rgba(0,0,0,0.6)',
  }

  const rowBtnStyle = (accent = false): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 28,
    borderRadius: 5,
    border: 'none',
    background: accent ? 'rgba(255,107,53,0.12)' : 'transparent',
    color: accent ? 'var(--color-helios-accent)' : 'var(--color-helios-muted)',
    cursor: 'pointer',
    flexShrink: 0,
  })

  return (
    <div style={overlayStyle} onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div style={cardStyle}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--color-helios-border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FolderOpen size={16} style={{ color: 'var(--color-helios-accent)' }} />
            <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--color-helios-text)' }}>Projects</span>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-helios-muted)', padding: 4, borderRadius: 4, display: 'flex' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Current project save strip */}
        {(currentProject || isDirty) && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px', background: 'rgba(255,107,53,0.06)', borderBottom: '1px solid var(--color-helios-border)', flexShrink: 0, gap: 12 }}>
            <span style={{ fontSize: 12, color: 'var(--color-helios-muted)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {isDirty && <span style={{ color: 'var(--color-helios-warning)', marginRight: 6 }}>●</span>}
              {currentProject ? currentProject.name : 'Unsaved project'}
            </span>
            <button
              onClick={() => { onSaveCurrent(); onClose() }}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 5, border: 'none', background: 'var(--color-helios-accent)', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}
            >
              <Save size={12} />
              {currentProject ? 'Save' : 'Save as new'}
            </button>
          </div>
        )}

        {/* Project list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px' }}>
          {projects.length === 0 ? (
            <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--color-helios-muted)', fontSize: 13 }}>
              No saved projects yet
            </div>
          ) : (
            projects.map((project) => {
              const isActive = currentProject?.id === project.id
              return (
                <div
                  key={project.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 10px',
                    borderRadius: 7,
                    background: isActive ? 'rgba(255,107,53,0.08)' : 'transparent',
                    border: `1px solid ${isActive ? 'var(--color-helios-accent)' : 'transparent'}`,
                    marginBottom: 4,
                  }}
                >
                  {renamingId === project.id ? (
                    <>
                      <input
                        ref={renameRef}
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') commitRename(project)
                          if (e.key === 'Escape') setRenamingId(null)
                        }}
                        style={{
                          flex: 1, padding: '3px 8px', borderRadius: 4,
                          background: 'var(--color-helios-bg)',
                          border: '1px solid var(--color-helios-accent)',
                          color: 'var(--color-helios-text)', fontSize: 13, outline: 'none',
                        }}
                      />
                      <button style={rowBtnStyle(true)} onClick={() => commitRename(project)}>
                        <Check size={13} />
                      </button>
                    </>
                  ) : (
                    <>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: isActive ? 'var(--color-helios-accent)' : 'var(--color-helios-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {project.name}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--color-helios-muted)', marginTop: 2 }}>
                          {project.devices.length} device{project.devices.length !== 1 ? 's' : ''} · {formatDate(project.updatedAt)}
                        </div>
                      </div>

                      <button style={rowBtnStyle()} title="Rename" onClick={() => { setRenamingId(project.id); setRenameValue(project.name) }}>
                        <Pencil size={13} />
                      </button>
                      <button style={rowBtnStyle()} title="Export" onClick={() => handleExport(project)}>
                        <Download size={13} />
                      </button>
                      <button
                        style={rowBtnStyle(true)}
                        title="Load project"
                        onClick={() => { onLoad(project); onClose() }}
                      >
                        <FolderOpen size={13} />
                      </button>
                      <button
                        style={{ ...rowBtnStyle(), color: 'var(--color-helios-error)' }}
                        title="Delete"
                        onClick={() => handleDelete(project.id)}
                      >
                        <Trash2 size={13} />
                      </button>
                    </>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* Footer actions */}
        <div style={{ display: 'flex', gap: 8, padding: '12px 20px', borderTop: '1px solid var(--color-helios-border)', flexShrink: 0 }}>
          <button
            onClick={handleImport}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 6, border: '1px solid var(--color-helios-border)', background: 'transparent', color: 'var(--color-helios-muted)', fontSize: 12, cursor: 'pointer' }}
          >
            <Upload size={13} />
            Import file
          </button>
          <button
            onClick={() => { onSaveCurrent(); onClose() }}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 6, border: 'none', background: 'var(--color-helios-accent)', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', marginLeft: 'auto' }}
          >
            <Plus size={13} />
            Save as new project
          </button>
        </div>
      </div>
    </div>
  )
}

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(iso))
  } catch {
    return iso
  }
}
