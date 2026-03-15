import type { View } from '../types';

interface HeaderProps {
  currentView: View;
  onNavigate: (view: View) => void;
}

export default function Header({ currentView, onNavigate }: HeaderProps) {
  return (
    <header className="header">
      <h1 className="header-title" onClick={() => onNavigate('search')}>
        BassTab Book
      </h1>
      <nav className="header-nav">
        <button
          className={`nav-btn ${currentView === 'search' ? 'active' : ''}`}
          onClick={() => onNavigate('search')}
        >
          Sök
        </button>
        <button
          className={`nav-btn ${currentView === 'favorites' ? 'active' : ''}`}
          onClick={() => onNavigate('favorites')}
        >
          Favoriter
        </button>
      </nav>
    </header>
  );
}
