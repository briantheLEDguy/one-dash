import { contextBridge, ipcRenderer } from 'electron'
import type { HeliosDevice, Project } from '../shared/types'

const api = {
  startDiscovery: (): Promise<HeliosDevice[]> =>
    ipcRenderer.invoke('discovery:start'),

  stopDiscovery: (): Promise<void> =>
    ipcRenderer.invoke('discovery:stop'),

  addManualDevice: (ip: string, name: string, permission: 'read' | 'write'): Promise<void> =>
    ipcRenderer.invoke('discovery:addManual', ip, name, permission),

  onDevice: (cb: (device: HeliosDevice) => void): (() => void) => {
    const handler = (_: Electron.IpcRendererEvent, device: HeliosDevice) => cb(device)
    ipcRenderer.on('discovery:device', handler)
    return () => ipcRenderer.removeListener('discovery:device', handler)
  },

  onUpdateAvailable: (cb: (info: unknown) => void): (() => void) => {
    const handler = (_: Electron.IpcRendererEvent, info: unknown) => cb(info)
    ipcRenderer.on('update:available', handler)
    return () => ipcRenderer.removeListener('update:available', handler)
  },

  onUpdateDownloaded: (cb: (info: unknown) => void): (() => void) => {
    const handler = (_: Electron.IpcRendererEvent, info: unknown) => cb(info)
    ipcRenderer.on('update:downloaded', handler)
    return () => ipcRenderer.removeListener('update:downloaded', handler)
  },

  installUpdate: (): Promise<void> =>
    ipcRenderer.invoke('updater:install'),

  // Projects
  listProjects: (): Promise<Project[]> =>
    ipcRenderer.invoke('project:list'),

  saveProject: (project: Project): Promise<Project> =>
    ipcRenderer.invoke('project:save', project),

  deleteProject: (id: string): Promise<void> =>
    ipcRenderer.invoke('project:delete', id),

  exportProject: (project: Project): Promise<void> =>
    ipcRenderer.invoke('project:export', project),

  importProject: (): Promise<Project | null> =>
    ipcRenderer.invoke('project:import')
}

contextBridge.exposeInMainWorld('api', api)
