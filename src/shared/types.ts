export interface HeliosDevice {
  ip: string
  name: string
  serial: string
  version: string
  role: string
  source: 'mdns' | 'ssdp' | 'manual'
  permission: 'read' | 'write'
}

export interface ProjectDevice {
  ip: string
  name: string
  permission: 'read' | 'write'
  canvasOrder: number
}

export interface Project {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  devices: ProjectDevice[]
}
