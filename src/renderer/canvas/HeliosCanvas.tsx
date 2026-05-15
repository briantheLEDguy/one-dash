import React, { useEffect, useRef } from 'react'
import { Application } from 'pixi.js'
import { MultiProcessorScene } from './scenes/MultiProcessorScene'
import { useHeliosStore } from '../store/heliosStore'
import { fetchPreviewBlob } from '../api/heliosRest'

const PREVIEW_INTERVAL_MS = 2000

export default function HeliosCanvas() {
  const containerRef = useRef<HTMLDivElement>(null)
  const appRef = useRef<Application | null>(null)
  const sceneRef = useRef<MultiProcessorScene | null>(null)
  const previewUrlsRef = useRef<Record<string, string>>({})

  const deviceStates = useHeliosStore((s) => s.deviceStates)
  const credentials = useHeliosStore((s) => s.credentials)
  const selectProcessor = useHeliosStore((s) => s.selectProcessor)
  const selectTile = useHeliosStore((s) => s.selectTile)
  const selectedIp = useHeliosStore((s) => s.selectedProcessorIp)
  const selectedTileId = useHeliosStore((s) => s.selectedTileId)

  // Mount PixiJS once
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    let cancelled = false

    const app = new Application()
    app
      .init({
        resizeTo: container,
        backgroundColor: 0x1a1a1f,
        preference: 'webgl',
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true
      })
      .then(() => {
        if (cancelled) { app.destroy(true); return }
        container.appendChild(app.canvas)
        appRef.current = app

        const scene = new MultiProcessorScene(
          app,
          (ip) => { selectProcessor(ip); selectTile(null) },
          (ip, tileId) => { selectProcessor(ip); selectTile(tileId) }
        )
        sceneRef.current = scene
        app.stage.addChild(scene.container)
      })
      .catch(console.error)

    return () => {
      cancelled = true
      sceneRef.current = null
      // Revoke any lingering preview blob URLs
      Object.values(previewUrlsRef.current).forEach((u) => URL.revokeObjectURL(u))
      previewUrlsRef.current = {}
      try { appRef.current?.destroy(true) } catch { /* ignore */ }
      appRef.current = null
    }
  }, [])

  // Sync device states to scene whenever they change
  useEffect(() => {
    sceneRef.current?.updateAll(deviceStates)
  }, [deviceStates])

  // Sync selection (processor + tile)
  useEffect(() => {
    sceneRef.current?.updateSelection(selectedIp, selectedTileId)
  }, [selectedIp, selectedTileId])

  // Poll preview endpoint for each connected device
  useEffect(() => {
    const ips = Object.keys(deviceStates)
    if (!ips.length) return

    async function refreshPreviews() {
      const updates: Record<string, string | null> = {}
      for (const ip of ips) {
        const creds = credentials[ip]
        try {
          const newUrl = await fetchPreviewBlob(ip, creds)
          const old = previewUrlsRef.current[ip]
          if (old) URL.revokeObjectURL(old)
          previewUrlsRef.current[ip] = newUrl
          updates[ip] = newUrl
        } catch {
          // Device has no preview or it failed — leave existing URL or null
          updates[ip] = previewUrlsRef.current[ip] ?? null
        }
      }
      sceneRef.current?.updatePreviews(updates)
    }

    refreshPreviews()
    const timer = setInterval(refreshPreviews, PREVIEW_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [Object.keys(deviceStates).sort().join(','), credentials])

  return (
    <div
      ref={containerRef}
      style={{ flex: 1, minWidth: 0, minHeight: 0, overflow: 'hidden' }}
    />
  )
}
