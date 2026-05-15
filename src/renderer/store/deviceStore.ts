import { create } from 'zustand'
import type { HeliosDevice } from '../../../src/shared/types'

interface DeviceState {
  devices: HeliosDevice[]
  addDevice: (device: HeliosDevice) => void
  removeDevice: (ip: string) => void
  clearDevices: () => void
}

export const useDeviceStore = create<DeviceState>((set) => ({
  devices: [],

  addDevice: (device) =>
    set((state) => {
      const idx = state.devices.findIndex((d) => d.ip === device.ip)
      if (idx >= 0) {
        const next = [...state.devices]
        next[idx] = device
        return { devices: next }
      }
      return { devices: [...state.devices, device] }
    }),

  removeDevice: (ip) =>
    set((state) => ({ devices: state.devices.filter((d) => d.ip !== ip) })),

  clearDevices: () => set({ devices: [] }),
}))
