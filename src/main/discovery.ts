import { EventEmitter } from 'events'
import { Bonjour as BonjourCtor } from 'bonjour-service'
import { Client as SsdpClient } from 'node-ssdp'
import type { HeliosDevice } from '../shared/types'

export type { HeliosDevice }

export class DiscoveryManager extends EventEmitter {
  private bonjour: BonjourCtor | null = null
  private ssdpClient: InstanceType<typeof SsdpClient> | null = null
  private bonjourBrowser: ReturnType<BonjourCtor['find']> | null = null
  private discovered = new Map<string, HeliosDevice>()

  startMdns(): void {
    this.bonjour = new BonjourCtor()
    this.bonjourBrowser = this.bonjour.find({ type: 'http' })
    this.bonjourBrowser.on('up', (service) => {
      const txt = (service.txt ?? {}) as Record<string, string>
      if (txt['manufacturer']?.toLowerCase() !== 'megapixel') return

      const ip = service.addresses?.[0] ?? service.host
      this.upsertDevice({
        ip,
        name: service.name,
        serial: txt['serial'] ?? '',
        version: txt['version'] ?? '',
        role: txt['role'] ?? 'unknown',
        source: 'mdns',
        permission: 'write'
      })
    })
  }

  startSsdp(): void {
    try {
      this.ssdpClient = new SsdpClient()
      this.ssdpClient.on('response', (headers, _statusCode, rinfo) => {
        const server = String(headers['SERVER'] ?? headers['server'] ?? '')
        const model = String(headers['X-HELIOS-MODEL'] ?? headers['HELIOS-MODEL'] ?? '')
        if (!server.toLowerCase().includes('helios') && !model.includes('HELIOS')) return

        this.upsertDevice({
          ip: rinfo.address,
          name: String(headers['HELIOS-NAME'] ?? rinfo.address),
          serial: String(headers['HELIOS-SERIAL'] ?? ''),
          version: '',
          role: 'unknown',
          source: 'ssdp',
          permission: 'write'
        })
      })
      this.ssdpClient.search('ssdp:all')
    } catch (err) {
      console.warn('SSDP discovery unavailable (firewall may be blocking multicast):', err)
    }
  }

  addManual(ip: string, name?: string, permission: 'read' | 'write' = 'write'): void {
    this.upsertDevice({
      ip,
      name: name || ip,
      serial: '',
      version: '',
      role: 'manual',
      source: 'manual',
      permission
    })
  }

  private upsertDevice(device: HeliosDevice): void {
    const existing = this.discovered.get(device.ip)
    if (JSON.stringify(existing) === JSON.stringify(device)) return
    this.discovered.set(device.ip, device)
    this.emit('device', device)
  }

  getAll(): HeliosDevice[] {
    return Array.from(this.discovered.values())
  }

  stop(): void {
    try { this.bonjourBrowser?.stop(); this.bonjour?.destroy() } catch { /* ignore */ }
    try { this.ssdpClient?.stop() } catch { /* ignore */ }
    this.ssdpClient = null
  }
}
