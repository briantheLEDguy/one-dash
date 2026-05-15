import React, { useEffect, useRef, useState } from 'react'
import Sidebar from './components/Sidebar'
import StatusBar from './components/StatusBar'
import RightPanel from './components/RightPanel'
import BottomToolbar from './components/BottomToolbar'
import HeliosCanvas from './canvas/HeliosCanvas'
import { useDeviceStore } from './store/deviceStore'
import { useHeliosStore } from './store/heliosStore'
import { useProjectStore } from './store/projectStore'
import { useHeliosDevice } from './hooks/useHeliosDevice'
import type { NavId } from './components/Sidebar'
import type { HeliosDevice, Project } from '../../src/shared/types'

function DeviceSubscriber({ ip }: { ip: string }) {
  const creds = useHeliosStore((s) => s.credentials[ip])
  useHeliosDevice(ip, creds)
  return null
}

export default function App() {
  const { devices, addDevice, clearDevices } = useDeviceStore()
  const { setPermission, clearAll } = useHeliosStore()
  const { currentProject, isDirty, setCurrentProject, markDirty } = useProjectStore()
  const [updateBanner, setUpdateBanner] = useState<'available' | 'ready' | null>(null)
  const [activeNav, setActiveNav] = useState<NavId>('mapping')

  // Track whether current device list was set by loading a project (suppress dirty on first load)
  const loadingProject = useRef(false)
  const prevDeviceCount = useRef(devices.length)

  function handleDevice(device: HeliosDevice) {
    addDevice(device)
    setPermission(device.ip, device.permission)
  }

  useEffect(() => {
    window.api.startDiscovery().then((initial: HeliosDevice[]) => {
      initial.forEach(handleDevice)
    }).catch(console.error)

    const cleanDevice = window.api.onDevice(handleDevice)
    const cleanAvailable = window.api.onUpdateAvailable(() => setUpdateBanner('available'))
    const cleanReady = window.api.onUpdateDownloaded(() => setUpdateBanner('ready'))

    return () => {
      cleanDevice()
      cleanAvailable()
      cleanReady()
      window.api.stopDiscovery().catch(console.error)
    }
  }, [])

  // Mark project dirty whenever devices change outside of a project load
  useEffect(() => {
    if (loadingProject.current) return
    if (devices.length !== prevDeviceCount.current) {
      prevDeviceCount.current = devices.length
      if (currentProject) markDirty()
    }
  }, [devices])

  function handleLoadProject(project: Project) {
    loadingProject.current = true
    clearAll()
    clearDevices()

    const sorted = [...project.devices].sort((a, b) => a.canvasOrder - b.canvasOrder)
    sorted.forEach((pd) => {
      const device: HeliosDevice = {
        ip: pd.ip,
        name: pd.name,
        serial: '',
        version: '',
        role: 'manual',
        source: 'manual',
        permission: pd.permission,
      }
      addDevice(device)
      setPermission(pd.ip, pd.permission)
    })

    setCurrentProject(project)
    // Allow dirty tracking again after this tick
    setTimeout(() => {
      prevDeviceCount.current = sorted.length
      loadingProject.current = false
    }, 0)
  }

  async function handleSaveProject() {
    const projectDevices = devices.map((d, idx) => ({
      ip: d.ip,
      name: d.name,
      permission: d.permission,
      canvasOrder: idx,
    }))

    const base: Project = currentProject ?? {
      id: '',
      name: `Project ${new Date().toLocaleDateString()}`,
      createdAt: '',
      updatedAt: '',
      devices: projectDevices,
    }

    const saved = await window.api.saveProject({ ...base, devices: projectDevices }).catch(console.error)
    if (saved) setCurrentProject(saved)
  }

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        overflow: 'hidden',
        backgroundColor: 'var(--color-helios-bg)'
      }}
    >
      {devices.map((d) => (
        <DeviceSubscriber key={d.ip} ip={d.ip} />
      ))}

      <Sidebar activeNav={activeNav} onNavChange={setActiveNav} />

      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
        <StatusBar
          updateBanner={updateBanner}
          onInstallUpdate={() => window.api.installUpdate().catch(console.error)}
          onLoadProject={handleLoadProject}
          onSaveProject={handleSaveProject}
        />
        <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
          <HeliosCanvas />
          <RightPanel activeNav={activeNav} />
        </div>
        <BottomToolbar />
      </div>
    </div>
  )
}
