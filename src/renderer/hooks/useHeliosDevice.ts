import { useEffect, useRef } from 'react'
import { useHeliosStore, type Credentials, type TileReceiver, type DisplayState } from '../store/heliosStore'
import { getAll } from '../api/heliosRest'
import { HeliosRpcClient } from '../api/heliosRpc'

export function useHeliosDevice(ip: string, creds?: Credentials): void {
  const { initDevice, setDeviceState, updateDisplay, updateReceivers, setError, setLoading } =
    useHeliosStore()
  const rpcRef = useRef<HeliosRpcClient | null>(null)

  useEffect(() => {
    initDevice(ip)
    setLoading(ip, true)
    let cancelled = false

    async function init() {
      try {
        const state = await getAll(ip, creds)
        if (cancelled) return

        setDeviceState(ip, {
          display: state.display,
          input: state.input,
          receivers: state.receivers,
          groups: state.groups,
          alertsCount: state.alertsCount,
          sysAlerts: state.sysAlerts,
          loading: false,
          error: null
        })

        const rpc = new HeliosRpcClient()
        rpcRef.current = rpc

        try {
          await rpc.connect(ip, creds)
        } catch (wsErr) {
          console.warn(`RPC WebSocket unavailable for ${ip} — REST-only mode:`, wsErr)
          return
        }

        if (cancelled) { rpc.disconnect(); return }

        rpc.on('update', (params) => {
          if (cancelled) return
          const p = (params ?? {}) as Record<string, unknown>
          const dev = (p['dev'] ?? {}) as Record<string, unknown>

          if (dev['display']) {
            updateDisplay(ip, dev['display'] as Partial<DisplayState>)
          }
          if (dev['receivers']) {
            const raw = dev['receivers'] as Record<string, Record<string, unknown>>
            const receivers: TileReceiver[] = Object.entries(raw).map(([id, r]) => ({
              id,
              x: (r['x'] as number) ?? 0,
              y: (r['y'] as number) ?? 0,
              width: (r['width'] as number) ?? 192,
              height: (r['height'] as number) ?? 192,
              groupId: (r['groupId'] as number) ?? -1,
              info: (r['info'] as TileReceiver['info']) ?? {}
            }))
            updateReceivers(ip, receivers)
          }
        })
      } catch (err) {
        if (cancelled) return
        setError(ip, err instanceof Error ? err.message : 'Connection failed')
      }
    }

    init()

    return () => {
      cancelled = true
      rpcRef.current?.disconnect()
      rpcRef.current = null
    }
  }, [ip, creds?.username, creds?.password])
}
