/// <reference types="vite/client" />

import type { HeliosDevice, Project } from '../../src/shared/types'

declare global {
  interface Window {
    api: {
      startDiscovery: () => Promise<HeliosDevice[]>
      stopDiscovery: () => Promise<void>
      addManualDevice: (ip: string, name: string, permission: 'read' | 'write') => Promise<void>
      onDevice: (cb: (device: HeliosDevice) => void) => () => void
      onUpdateAvailable: (cb: (info: unknown) => void) => () => void
      onUpdateDownloaded: (cb: (info: unknown) => void) => () => void
      installUpdate: () => Promise<void>
      listProjects: () => Promise<Project[]>
      saveProject: (project: Project) => Promise<Project>
      deleteProject: (id: string) => Promise<void>
      exportProject: (project: Project) => Promise<void>
      importProject: () => Promise<Project | null>
    }
  }
}

export {}
