import { useNavigationStore } from './store/useNavigationStore'
import { BottomNavigation } from './components/BottomNavigation'
import { HomePage } from './pages/HomePage'
import { ChatPage } from './pages/ChatPage'
import './App.css'

function App() {
  const { activeTab } = useNavigationStore()

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return <HomePage />
      case 'chat':
        return <ChatPage />
      case 'tickets':
        return (
          <div className="page-content">
            <h1>Tickets</h1>
            <p>Billets</p>
          </div>
        )
      case 'profile':
        return (
          <div className="page-content">
            <h1>Profile</h1>
            <p>Profil</p>
          </div>
        )
      default:
        return <HomePage />
    }
  }

  return (
    <div className="app">
      {renderContent()}
      <BottomNavigation />
    </div>
  )
}

export default App
