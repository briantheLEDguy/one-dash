import { app, BrowserWindow, session, ipcMain } from 'electron'
import { join } from 'path'
import { autoUpdater } from 'electron-updater'
import { registerIpcHandlers } from './ipc'

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 600,
    backgroundColor: '#1a1a1f',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  // Inject CORS headers so the renderer can reach HELIOS devices on any IP/port,
  // and set a permissive CSP that allows LAN WebSocket + HTTP connections.
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    // For CORS preflight (OPTIONS) requests, the device may return a non-2xx status
    // which Chromium rejects before checking CORS headers. Override the status to 204
    // so the preflight succeeds and the actual PATCH/PUT can proceed.
    callback({
      ...(details.method === 'OPTIONS' ? { statusLine: 'HTTP/1.1 204 No Content' } : {}),
      responseHeaders: {
        ...details.responseHeaders,
        'Access-Control-Allow-Origin': ['*'],
        'Access-Control-Allow-Headers': ['*'],
        'Access-Control-Allow-Methods': ['GET, POST, PUT, PATCH, DELETE, OPTIONS'],
        'Content-Security-Policy': [
          "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src 'self' ws: wss: http: https:; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; worker-src blob:"
        ]
      }
    })
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
    win.webContents.openDevTools({ mode: 'detach' })
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }

  autoUpdater.on('update-available', (info) => {
    win.webContents.send('update:available', info)
  })
  autoUpdater.on('update-downloaded', (info) => {
    win.webContents.send('update:downloaded', info)
  })

  return win
}

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.whenReady().then(() => {
    registerIpcHandlers()
    createWindow()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })

    if (!process.env['ELECTRON_RENDERER_URL']) {
      autoUpdater.checkForUpdatesAndNotify().catch(console.error)
    }
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })

  ipcMain.handle('updater:install', () => {
    autoUpdater.quitAndInstall()
  })
}
