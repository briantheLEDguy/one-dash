type RpcCallback = (params: unknown) => void

interface PendingCall {
  resolve: (v: unknown) => void
  reject: (e: Error) => void
}

interface RpcMessage {
  jsonrpc: '2.0'
  id?: number
  method?: string
  result?: unknown
  params?: unknown
  error?: { message: string; code: number }
}

export interface RpcCredentials {
  username: string
  password: string
}

export class HeliosRpcClient {
  private ws: WebSocket | null = null
  private pending = new Map<number, PendingCall>()
  private listeners = new Map<string, Set<RpcCallback>>()
  private counter = 1
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private shouldReconnect = true
  private savedIp = ''
  private savedCreds?: RpcCredentials

  connect(ip: string, creds?: RpcCredentials): Promise<void> {
    this.savedIp = ip
    this.savedCreds = creds
    this.shouldReconnect = true
    return this.openSocket(ip, creds)
  }

  private openSocket(ip: string, creds?: RpcCredentials): Promise<void> {
    return new Promise((resolve, reject) => {
      const url = creds
        ? `ws://${encodeURIComponent(creds.username)}:${encodeURIComponent(creds.password)}@${ip}/api/v1/public/rpc/websocket`
        : `ws://${ip}/api/v1/public/rpc/websocket`

      this.ws = new WebSocket(url)

      const onOpen = () => {
        this.ws!.removeEventListener('error', onInitError)
        resolve()
      }
      const onInitError = () => reject(new Error(`WebSocket connect failed: ${ip}`))

      this.ws.addEventListener('open', onOpen, { once: true })
      this.ws.addEventListener('error', onInitError, { once: true })

      this.ws.onmessage = (evt: MessageEvent) => {
        try {
          this.handleMessage(JSON.parse(evt.data as string) as RpcMessage)
        } catch { /* ignore malformed frames */ }
      }

      this.ws.onclose = () => {
        if (this.shouldReconnect) {
          this.reconnectTimer = setTimeout(
            () => this.openSocket(this.savedIp, this.savedCreds).catch(() => { /* keep trying */ }),
            3000
          )
        }
      }
    })
  }

  private handleMessage(msg: RpcMessage): void {
    if (msg.id !== undefined) {
      const pending = this.pending.get(msg.id)
      if (!pending) return
      this.pending.delete(msg.id)
      if (msg.error) pending.reject(new Error(msg.error.message))
      else pending.resolve(msg.result)
    } else if (msg.method) {
      this.listeners.get(msg.method)?.forEach((cb) => cb(msg.params))
    }
  }

  call<T = unknown>(method: string, params?: unknown): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error('WebSocket not connected'))
        return
      }
      const id = this.counter++
      this.pending.set(id, { resolve: resolve as (v: unknown) => void, reject })
      this.ws.send(JSON.stringify({ jsonrpc: '2.0', id, method, params }))
    })
  }

  on(method: string, cb: RpcCallback): () => void {
    if (!this.listeners.has(method)) this.listeners.set(method, new Set())
    this.listeners.get(method)!.add(cb)
    return () => this.listeners.get(method)?.delete(cb)
  }

  disconnect(): void {
    this.shouldReconnect = false
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    this.pending.forEach((p) => p.reject(new Error('WebSocket disconnected')))
    this.pending.clear()
    this.ws?.close()
    this.ws = null
  }
}
