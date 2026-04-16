import { useLayoutEffect, useRef } from 'react'
import { useNavigationStore, type DetailState } from './store/useNavigationStore'
import { useMessagingStore } from './store/useMessagingStore'
import { BottomNavigation } from './components/BottomNavigation'
import { ChatPage } from './pages/ChatPage'
import { EventsPage } from './pages/EventsPage'
import { ProfilePage } from './pages/ProfilePage'
import { ChatRoomPage } from './pages/ChatRoomPage'
import { EventDetailPage } from './pages/EventDetailPage'
import { CreateEventPage } from './pages/CreateEventPage'
import { OtherProfilePage } from './pages/OtherProfilePage'
import { ChatSettingsPage } from './pages/ChatSettingsPage'
import './App.css'

function renderDetailContent(detail: DetailState) {
  switch (detail.type) {
    case 'chat':
      return <ChatRoomPage id={detail.id} />
    case 'event':
      return <EventDetailPage id={detail.id} />
    case 'event_create':
      return <CreateEventPage formEventId={detail.id} />
    case 'profile':
      return <OtherProfilePage id={detail.id} />
    case 'chat_settings':
      return <ChatSettingsPage id={detail.id} />
    default:
      return null
  }
}

function App() {
  const { activeTab, detailStack } = useNavigationStore()
  const toast = useMessagingStore((s) => s.toast)
  const mainRef = useRef<HTMLElement>(null)

  /** Chaque onglet repart du haut (pas la position de scroll de la page précédente). */
  useLayoutEffect(() => {
    const main = mainRef.current
    if (main) main.scrollTop = 0
    window.scrollTo(0, 0)
    const se = document.scrollingElement
    if (se) se.scrollTop = 0
  }, [activeTab])

  const renderTab = () => {
    switch (activeTab) {
      case 'chat':
        return <ChatPage />
      case 'events':
        return <EventsPage />
      case 'profile':
        return <ProfilePage />
      default:
        return <ChatPage />
    }
  }

  /**
   * Pile entièrement montée : on ne met pas `visibility: hidden` sur les couches du dessous,
   * sinon un overlay semi-transparent (ex. paramètres de discussion) ne « voile » plus la salle
   * de chat — on ne voit que l’onglet derrière, comme si la conversation avait disparu.
   * `pointer-events: none` suffit à bloquer les interactions sur les couches inférieures.
   */
  const renderDetailStack = () => {
    if (detailStack.length === 0) return null
    return detailStack.map((detail, index) => {
      const isTop = index === detailStack.length - 1
      return (
        <div
          key={`${detail.type}-${detail.id}-${index}`}
          className="detail-stack-layer"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000 + index * 10,
            pointerEvents: isTop ? 'auto' : 'none',
          }}
          aria-hidden={!isTop}
        >
          {renderDetailContent(detail)}
        </div>
      )
    })
  }

  return (
    <div className="app dark">
      <main ref={mainRef} className="app-content">
        {renderTab()}
        {renderDetailStack()}
      </main>
      <BottomNavigation />
      {toast ? (
        <div className="nel-toast" role="status" aria-live="polite">
          {toast.message}
        </div>
      ) : null}
    </div>
  )
}

export default App
