import { useNavigationStore } from './store/useNavigationStore'
import { BottomNavigation } from './components/BottomNavigation'
import { ChatPage } from './pages/ChatPage'
import { EventsPage } from './pages/EventsPage'
import { ProfilePage } from './pages/ProfilePage'
import { ChatRoomPage } from './pages/ChatRoomPage'
import { EventDetailPage } from './pages/EventDetailPage'
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

  const renderDetail = () => {
    if (!currentDetail) return null
    switch (currentDetail.type) {
      case 'chat':
        return <ChatRoomPage id={currentDetail.id} />
      case 'event':
        return <EventDetailPage id={currentDetail.id} />
      case 'profile':
        return <OtherProfilePage id={currentDetail.id} />
      case 'chat_settings':
        return <ChatSettingsPage id={currentDetail.id} />
      default:
        return null
    }
  }

  return (
    <div className="app dark">
      <main className="app-content">
        {renderTab()}
        {renderDetail()}
      </main>
      <BottomNavigation />
    </div>
  )
}

export default App
