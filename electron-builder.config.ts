import type { Configuration } from 'electron-builder'

const config: Configuration = {
  appId: 'com.megapixel.one-dash',
  productName: 'one-dash',
  directories: {
    buildResources: 'build',
    output: 'release'
  },
  files: ['out/**/*'],
  mac: {
    target: [
      { target: 'dmg', arch: ['x64', 'arm64'] },
      { target: 'zip', arch: ['x64', 'arm64'] }
    ],
    category: 'public.app-category.utilities',
    hardenedRuntime: true,
    gatekeeperAssess: false,
    entitlements: 'build/entitlements.mac.plist',
    entitlementsInherit: 'build/entitlements.mac.plist'
  },
  win: {
    target: [{ target: 'nsis' }]
  },
  linux: {
    target: [{ target: 'AppImage' }],
    category: 'Utility'
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true
  },
  publish: {
    provider: 'github',
    releaseType: 'release'
  },
  afterSign: 'build/notarize.js'
}

export default config
