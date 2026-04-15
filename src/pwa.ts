import { registerSW } from 'virtual:pwa-register'

if (import.meta.env.PROD) {
  const updateSW = registerSW({
    onNeedRefresh() {
      if (confirm('New content available. Reload?')) {
        updateSW(true)
      }
    },
    onOfflineReady() {
      console.log('Content cached for offline use.')
    },
  })
}
