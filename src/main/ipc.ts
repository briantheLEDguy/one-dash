import { ipcMain, BrowserWindow } from 'electron'
import { DiscoveryManager, type HeliosDevice } from './discovery'
import { listProjects, saveProject, deleteProject, exportProject, importProject } from './projects'
import type { Project } from '../shared/types'

let discovery: DiscoveryManager | null = null

function getMainWindow(): BrowserWindow | null {
  return BrowserWindow.getAllWindows()[0] ?? null
}

export function registerIpcHandlers(): void {
  ipcMain.handle('discovery:start', async () => {
    if (discovery) discovery.stop()

    discovery = new DiscoveryManager()
    discovery.on('device', (device: HeliosDevice) => {
      getMainWindow()?.webContents.send('discovery:device', device)
    })

    discovery.startMdns()
    discovery.startSsdp()

    return discovery.getAll()
  })

  ipcMain.handle('discovery:stop', async () => {
    discovery?.stop()
    discovery = null
  })

  ipcMain.handle('discovery:addManual', async (_event, ip: string, name: string, permission: 'read' | 'write') => {
    if (!discovery) {
      discovery = new DiscoveryManager()
      discovery.on('device', (device: HeliosDevice) => {
        getMainWindow()?.webContents.send('discovery:device', device)
      })
    }
    discovery.addManual(ip, name, permission)
  })

  // Project handlers
  ipcMain.handle('project:list', async (): Promise<Project[]> => listProjects())

  ipcMain.handle('project:save', async (_event, project: Project): Promise<Project> =>
    saveProject(project)
  )

  ipcMain.handle('project:delete', async (_event, id: string): Promise<void> =>
    deleteProject(id)
  )

  ipcMain.handle('project:export', async (_event, project: Project): Promise<void> =>
    exportProject(project)
  )

  ipcMain.handle('project:import', async (): Promise<Project | null> =>
    importProject()
  )
}
