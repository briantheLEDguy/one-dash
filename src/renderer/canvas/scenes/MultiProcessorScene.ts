import { Container, Graphics, Text, TextStyle, type Application } from 'pixi.js'
import type { HeliosDeviceState, TileReceiver } from '../../store/heliosStore'

const GROUP_COLORS = [
  0xe05252, // red
  0x52b052, // green
  0x5282e0, // blue
  0xe09052, // orange
  0x9052e0, // purple
  0x52d8d8, // cyan
  0xe0d252, // yellow
  0xe05290  // pink
]

const SECTION_GAP = 40
const LABEL_HEIGHT = 26
const TILE_GAP = 2

class ProcessorSection {
  container = new Container()
  private nameLabel: Text
  private statusLabel: Text
  private selectionOutline: Graphics
  private tileGraphics = new Map<string, Graphics>()
  private isSelected = false

  constructor(public readonly ip: string, private onSelect: (ip: string) => void) {
    this.container.interactive = true
    this.container.cursor = 'pointer'
    this.container.on('pointerdown', (e) => {
      e.stopPropagation()
      onSelect(ip)
    })

    const labelStyle = new TextStyle({
      fill: 0x9999aa,
      fontSize: 11,
      fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, system-ui, sans-serif',
      fontWeight: '500'
    })

    this.nameLabel = new Text({ text: ip, style: labelStyle })
    this.container.addChild(this.nameLabel)

    const statusStyle = new TextStyle({
      fill: 0x6b6b80,
      fontSize: 10,
      fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, system-ui, sans-serif'
    })
    this.statusLabel = new Text({ text: '', style: statusStyle })
    this.container.addChild(this.statusLabel)

    this.selectionOutline = new Graphics()
    this.container.addChild(this.selectionOutline)
  }

  update(state: HeliosDeviceState, sectionW: number, sectionH: number): void {
    const name = state.receivers[0]?.info?.name ?? this.ip
    const displayName = name.length > 22 ? name.slice(0, 20) + '…' : name
    this.nameLabel.text = displayName

    const status = state.loading
      ? 'Connecting…'
      : state.error
        ? `Error: ${state.error.slice(0, 20)}`
        : `${state.receivers.length} tiles`
    this.statusLabel.text = status

    this.renderTiles(state.receivers, sectionW, sectionH)
    this.updateOutline(sectionW, sectionH)
    this.positionLabels(sectionW)
  }

  private renderTiles(receivers: TileReceiver[], sectionW: number, sectionH: number): void {
    const currentIds = new Set(receivers.map((r) => r.id))

    for (const [id, gfx] of this.tileGraphics) {
      if (!currentIds.has(id)) {
        this.container.removeChild(gfx)
        gfx.destroy()
        this.tileGraphics.delete(id)
      }
    }

    if (!receivers.length) return

    const maxX = receivers.reduce((m, r) => Math.max(m, r.x + r.width), 0) || 1
    const maxY = receivers.reduce((m, r) => Math.max(m, r.y + r.height), 0) || 1

    const usableH = sectionH - LABEL_HEIGHT
    const scale = Math.min(sectionW / maxX, usableH / maxY)
    const renderedW = maxX * scale
    const renderedH = maxY * scale
    const offsetX = (sectionW - renderedW) / 2
    const offsetY = LABEL_HEIGHT + (usableH - renderedH) / 2

    for (const r of receivers) {
      let gfx = this.tileGraphics.get(r.id)
      if (!gfx) {
        gfx = new Graphics()
        gfx.interactive = true
        gfx.cursor = 'pointer'
        gfx.on('pointerdown', (e) => {
          e.stopPropagation()
          this.onSelect(this.ip)
        })
        this.container.addChildAt(gfx, 1)
        this.tileGraphics.set(r.id, gfx)
      }

      const groupIdx = Math.max(0, r.groupId)
      const color = GROUP_COLORS[groupIdx % GROUP_COLORS.length]
      const alpha = this.isSelected ? 0.9 : 0.72

      const x = offsetX + r.x * scale + TILE_GAP / 2
      const y = offsetY + r.y * scale + TILE_GAP / 2
      const w = Math.max(1, r.width * scale - TILE_GAP)
      const h = Math.max(1, r.height * scale - TILE_GAP)

      gfx
        .clear()
        .rect(x, y, w, h)
        .fill({ color, alpha })
        .stroke({ color: 0xffffff, alpha: 0.1, width: 1 })
    }
  }

  private updateOutline(sectionW: number, sectionH: number): void {
    this.selectionOutline.clear()
    if (this.isSelected) {
      this.selectionOutline
        .rect(0, 0, sectionW, sectionH)
        .stroke({ color: 0xff6b35, alpha: 0.6, width: 2 })
    }
  }

  private positionLabels(sectionW: number): void {
    this.nameLabel.x = Math.max(0, sectionW / 2 - this.nameLabel.width / 2)
    this.nameLabel.y = 4
    this.statusLabel.x = Math.max(0, sectionW / 2 - this.statusLabel.width / 2)
    this.statusLabel.y = 15
  }

  setSelected(selected: boolean): void {
    this.isSelected = selected
    this.container.alpha = selected ? 1.0 : 0.8
  }

  destroy(): void {
    this.tileGraphics.forEach((g) => g.destroy())
    this.tileGraphics.clear()
    this.container.destroy({ children: true })
  }
}

export class MultiProcessorScene {
  readonly container = new Container()
  private sections = new Map<string, ProcessorSection>()
  private lastStates: Record<string, HeliosDeviceState> = {}
  private readonly onSelectProcessor: (ip: string | null) => void

  constructor(private readonly app: Application, onSelectProcessor: (ip: string | null) => void) {
    this.onSelectProcessor = onSelectProcessor

    this.container.interactive = true
    this.container.on('pointerdown', () => onSelectProcessor(null))

    app.renderer.on('resize', () => this.layout(this.lastStates))
  }

  updateAll(deviceStates: Record<string, HeliosDeviceState>): void {
    this.lastStates = deviceStates
    const ips = Object.keys(deviceStates)

    for (const [ip, section] of this.sections) {
      if (!ips.includes(ip)) {
        this.container.removeChild(section.container)
        section.destroy()
        this.sections.delete(ip)
      }
    }

    for (const ip of ips) {
      if (!this.sections.has(ip)) {
        const section = new ProcessorSection(ip, (sectionIp) => this.onSelectProcessor(sectionIp))
        this.sections.set(ip, section)
        this.container.addChild(section.container)
      }
    }

    this.layout(deviceStates)
  }

  private layout(deviceStates: Record<string, HeliosDeviceState>): void {
    const ips = Array.from(this.sections.keys()).sort()
    if (!ips.length) return

    const canvasW = this.app.renderer.width
    const canvasH = this.app.renderer.height
    const count = ips.length
    const totalGap = SECTION_GAP * (count + 1)
    const sectionW = Math.max(80, (canvasW - totalGap) / count)
    const sectionH = canvasH - SECTION_GAP * 2

    ips.forEach((ip, idx) => {
      const section = this.sections.get(ip)!
      section.container.x = SECTION_GAP + idx * (sectionW + SECTION_GAP)
      section.container.y = SECTION_GAP

      const state = deviceStates[ip]
      if (state) {
        section.update(state, sectionW, sectionH)
      }
    })
  }

  setSelected(ip: string | null): void {
    for (const [sectionIp, section] of this.sections) {
      section.setSelected(sectionIp === ip)
    }
    // Re-draw outlines
    this.layout(this.lastStates)
  }
}
