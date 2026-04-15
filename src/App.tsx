import { useNavigationStore } from './store/useNavigationStore'
import { BottomNavigation } from './components/BottomNavigation'
import { ChatPage } from './pages/ChatPage'
import { EventsPage } from './pages/EventsPage'
import { ProfilePage } from './pages/ProfilePage'
import './App.css'

function App() {
  const { activeTab } = useNavigationStore()

  const renderContent = () => {
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

  return (
    <div className="app dark">
      {renderContent()}
      <BottomNavigation />
    </div>
  )
}

export default App
