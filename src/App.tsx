import { useNavigationStore } from './store/useNavigationStore'
import { useThemeStore } from './store/useThemeStore'
import { BottomNavigation } from './components/BottomNavigation'
import { HomePage } from './pages/HomePage'
import { ChatPage } from './pages/ChatPage'
import { TicketsPage } from './pages/TicketsPage'
import { ProfilePage } from './pages/ProfilePage'
import './App.css'

function App() {
  const { activeTab } = useNavigationStore()
  const { isDarkMode } = useThemeStore()

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return <HomePage />
      case 'chat':
        return <ChatPage />
      case 'tickets':
        return <TicketsPage />
      case 'profile':
        return <ProfilePage />
      default:
        return <HomePage />
    }
  }

  return (
    <div className={`app ${isDarkMode ? 'dark' : 'light'}`}>
      {renderContent()}
      <BottomNavigation />
    </div>
  )
}

export default App
