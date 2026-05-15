import { create } from 'zustand'

export interface TileReceiver {
  id: string
  x: number
  y: number
  width: number
  height: number
  groupId: number
  info?: {
    name?: string
    pixelsW?: number
    pixelsH?: number
    connected?: boolean
  }
}

export interface DisplayState {
  brightness: number
  gamma: number
  cct: number
  blackout: boolean
  freeze: boolean
}

export interface InputState {
  input: string
  inputs: Record<string, { name: string; valid: boolean; resolution?: string }>
  testPattern: {
    enabled: boolean
    type?: string
    motion?: boolean
  }
}

export interface GroupState {
  id: number
  key: string
  name: string
  blackout: boolean
  gains: { r: number; g: number; b: number; i: number }
}

export interface AlertMap {
  [key: string]: { brief: string; severity: number; count: number }
}

export interface HeliosDeviceState {
  receivers: TileReceiver[]
  display: DisplayState
  input: InputState
  groups: GroupState[]
  sysAlerts: AlertMap
  alertsCount: number
  loading: boolean
  error: string | null
}

export interface Credentials {
  username: string
  password: string
}

const defaultDisplay = (): DisplayState => ({
  brightness: 100,
  gamma: 2.2,
  cct: 6500,
  blackout: false,
  freeze: false
})

const defaultInput = (): InputState => ({
  input: '',
  inputs: {},
  testPattern: { enabled: false }
})

const defaultDeviceState = (): HeliosDeviceState => ({
  receivers: [],
  display: defaultDisplay(),
  input: defaultInput(),
  groups: [],
  sysAlerts: {},
  alertsCount: 0,
  loading: true,
  error: null
})

interface HeliosStoreState {
  deviceStates: Record<string, HeliosDeviceState>
  credentials: Record<string, Credentials>
  permissions: Record<string, 'read' | 'write'>
  selectedProcessorIp: string | null
  selectedTileId: string | null

  initDevice: (ip: string) => void
  setDeviceState: (ip: string, state: Partial<HeliosDeviceState>) => void
  updateDisplay: (ip: string, display: Partial<DisplayState>) => void
  updateInput: (ip: string, input: Partial<InputState>) => void
  updateReceivers: (ip: string, receivers: TileReceiver[]) => void
  updateGroups: (ip: string, groups: GroupState[]) => void
  updateGroup: (ip: string, groupKey: string, patch: Partial<GroupState>) => void
  updateReceiver: (ip: string, receiverId: string, patch: Partial<TileReceiver>) => void
  setError: (ip: string, error: string | null) => void
  setLoading: (ip: string, loading: boolean) => void
  selectProcessor: (ip: string | null) => void
  selectTile: (tileId: string | null) => void
  setCredentials: (ip: string, creds: Credentials) => void
  setPermission: (ip: string, permission: 'read' | 'write') => void
  getPermission: (ip: string) => 'read' | 'write'
  clearAll: () => void
}

export const useHeliosStore = create<HeliosStoreState>((set, get) => ({
  deviceStates: {},
  credentials: {},
  permissions: {},
  selectedProcessorIp: null,
  selectedTileId: null,

  initDevice: (ip) =>
    set((state) => ({
      deviceStates: {
        ...state.deviceStates,
        [ip]: state.deviceStates[ip] ?? defaultDeviceState()
      }
    })),

  setDeviceState: (ip, partial) =>
    set((state) => ({
      deviceStates: {
        ...state.deviceStates,
        [ip]: { ...(state.deviceStates[ip] ?? defaultDeviceState()), ...partial }
      }
    })),

  updateDisplay: (ip, display) =>
    set((state) => {
      const cur = state.deviceStates[ip] ?? defaultDeviceState()
      return {
        deviceStates: {
          ...state.deviceStates,
          [ip]: { ...cur, display: { ...cur.display, ...display } }
        }
      }
    }),

  updateInput: (ip, input) =>
    set((state) => {
      const cur = state.deviceStates[ip] ?? defaultDeviceState()
      return {
        deviceStates: {
          ...state.deviceStates,
          [ip]: { ...cur, input: { ...cur.input, ...input } }
        }
      }
    }),

  updateReceivers: (ip, receivers) =>
    set((state) => ({
      deviceStates: {
        ...state.deviceStates,
        [ip]: { ...(state.deviceStates[ip] ?? defaultDeviceState()), receivers }
      }
    })),

  updateGroups: (ip, groups) =>
    set((state) => ({
      deviceStates: {
        ...state.deviceStates,
        [ip]: { ...(state.deviceStates[ip] ?? defaultDeviceState()), groups }
      }
    })),

  updateGroup: (ip, groupKey, patch) =>
    set((state) => {
      const cur = state.deviceStates[ip] ?? defaultDeviceState()
      return {
        deviceStates: {
          ...state.deviceStates,
          [ip]: {
            ...cur,
            groups: cur.groups.map((g) => (g.key === groupKey ? { ...g, ...patch } : g))
          }
        }
      }
    }),

  updateReceiver: (ip, receiverId, patch) =>
    set((state) => {
      const cur = state.deviceStates[ip] ?? defaultDeviceState()
      return {
        deviceStates: {
          ...state.deviceStates,
          [ip]: {
            ...cur,
            receivers: cur.receivers.map((r) => (r.id === receiverId ? { ...r, ...patch } : r))
          }
        }
      }
    }),

  setError: (ip, error) =>
    set((state) => ({
      deviceStates: {
        ...state.deviceStates,
        [ip]: { ...(state.deviceStates[ip] ?? defaultDeviceState()), error, loading: false }
      }
    })),

  setLoading: (ip, loading) =>
    set((state) => ({
      deviceStates: {
        ...state.deviceStates,
        [ip]: { ...(state.deviceStates[ip] ?? defaultDeviceState()), loading }
      }
    })),

  selectProcessor: (ip) => set({ selectedProcessorIp: ip, selectedTileId: null }),

  selectTile: (tileId) => set({ selectedTileId: tileId }),

  setCredentials: (ip, creds) =>
    set((state) => ({ credentials: { ...state.credentials, [ip]: creds } })),

  setPermission: (ip, permission) =>
    set((state) => ({ permissions: { ...state.permissions, [ip]: permission } })),

  getPermission: (ip) => get().permissions[ip] ?? 'write',

  clearAll: () =>
    set({ deviceStates: {}, permissions: {}, selectedProcessorIp: null, selectedTileId: null }),
}))
