import { Menu, Moon, Sun, X } from 'lucide-react';
import { useState } from 'react';
import { useThemeStore } from '../store/useThemeStore';
import './BurgerMenu.css';

export function BurgerMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const { isDarkMode, toggleDarkMode } = useThemeStore();

  return (
    <>
      <button
        className="burger-menu-button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Menu"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {isOpen && (
        <>
          <div className="burger-menu-overlay" onClick={() => setIsOpen(false)} />
          <div className="burger-menu-content">
            <div className="burger-menu-item">
              <button
                className="theme-toggle"
                onClick={() => {
                  toggleDarkMode();
                  setIsOpen(false);
                }}
              >
                {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
                <span>{isDarkMode ? 'Mode clair' : 'Mode sombre'}</span>
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
