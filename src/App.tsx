import { BottomNavigation } from './components/BottomNavigation'
import { BurgerMenu } from './components/BurgerMenu'
import { useNavigationStore } from './store/useNavigationStore'
import { useThemeStore } from './store/useThemeStore'
import './App.css'

function App() {
  const { activeTab } = useNavigationStore()
  const { isDarkMode } = useThemeStore()

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return (
          <div className="page-content">
            <h1>Home</h1>
            <p>Page d'accueil</p>
          </div>
        )
      case 'wallet':
        return (
          <div className="page-content">
            <h1>Wallet</h1>
            <p>Portefeuille</p>
          </div>
        )
      case 'exchange':
        return (
          <div className="page-content">
            <h1>Exchange</h1>
            <p>Échange</p>
          </div>
        )
      case 'markets':
        return (
          <div className="page-content">
            <h1>Markets</h1>
            <p>Marchés</p>
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
        return null
    }
  }

  return (
    <div className={`app ${isDarkMode ? 'dark' : 'light'}`}>
      <BurgerMenu />
      {renderContent()}
      <BottomNavigation />
    </div>
  )
}

export default App
