import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { initThemeFromStorage } from './store/useThemeStore'
import './index.css'
import './styles/lightTheme.css'
import App from './App.tsx'
import { SplashGate } from './components/SplashGate'
import './pwa'

initThemeFromStorage()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SplashGate>
      <App />
    </SplashGate>
  </StrictMode>,
)
