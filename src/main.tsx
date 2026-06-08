import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { SplashGate } from './components/SplashGate'
import './pwa'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SplashGate>
      <App />
    </SplashGate>
  </StrictMode>,
)
