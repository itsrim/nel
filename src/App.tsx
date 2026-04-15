import { useNavigationStore, type DetailState } from './store/useNavigationStore'
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

function App() {
  const { activeTab, detailStack } = useNavigationStore()
  
  const currentDetail = detailStack.length > 0 ? detailStack[detailStack.length - 1] : null;

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

  /** Toute la pile reste montée (couches masquées) pour conserver scroll / état au retour d’un overlay. */
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
            visibility: isTop ? 'visible' : 'hidden',
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
      <main className="app-content">
        {renderTab()}
        {renderDetailStack()}
      </main>
      <BottomNavigation />
    </div>
  )
}

export default App
