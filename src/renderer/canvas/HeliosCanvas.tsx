import React, { useEffect, useRef } from 'react'
import { Application } from 'pixi.js'
import { MultiProcessorScene } from './scenes/MultiProcessorScene'
import { useHeliosStore } from '../store/heliosStore'

export default function HeliosCanvas() {
  const containerRef = useRef<HTMLDivElement>(null)
  const appRef = useRef<Application | null>(null)
  const sceneRef = useRef<MultiProcessorScene | null>(null)

  const deviceStates = useHeliosStore((s) => s.deviceStates)
  const selectProcessor = useHeliosStore((s) => s.selectProcessor)
  const selectedIp = useHeliosStore((s) => s.selectedProcessorIp)

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

        const scene = new MultiProcessorScene(app, (ip) => selectProcessor(ip))
        sceneRef.current = scene
        app.stage.addChild(scene.container)
      })
      .catch(console.error)

    return () => {
      cancelled = true
      sceneRef.current = null
      try { appRef.current?.destroy(true) } catch { /* ignore */ }
      appRef.current = null
    }
  }, [])

  // Sync device states to scene whenever they change
  useEffect(() => {
    sceneRef.current?.updateAll(deviceStates)
  }, [deviceStates])

  // Sync selection highlight
  useEffect(() => {
    sceneRef.current?.setSelected(selectedIp)
  }, [selectedIp])

  return (
    <div
      ref={containerRef}
      style={{ flex: 1, minWidth: 0, minHeight: 0, overflow: 'hidden' }}
    />
  )
}
