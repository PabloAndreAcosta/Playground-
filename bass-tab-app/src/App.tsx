import { useState, useCallback } from 'react';
import './App.css';
import Header from './components/Header';
import SearchBar from './components/SearchBar';
import SearchResults from './components/SearchResults';
import TabViewer from './components/TabViewer';
import FavoritesList from './components/FavoritesList';
import { searchSongs } from './services/songsterrApi';
import type { SongsterrSong, View } from './types';

function App() {
  const [view, setView] = useState<View>('search');
  const [results, setResults] = useState<SongsterrSong[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSong, setSelectedSong] = useState<SongsterrSong | null>(null);

  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setResults([]);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const songs = await searchSongs(query);
      setResults(songs);
    } catch (err) {
      setError('Kunde inte söka. Kontrollera din internetanslutning.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSelectSong = useCallback((song: SongsterrSong) => {
    setSelectedSong(song);
    setView('viewer');
  }, []);

  const handleBack = useCallback(() => {
    setSelectedSong(null);
    setView('search');
  }, []);

  const handleNavigate = useCallback((newView: View) => {
    if (newView !== 'viewer') {
      setSelectedSong(null);
    }
    setView(newView);
  }, []);

  return (
    <div className="app">
      <Header currentView={view} onNavigate={handleNavigate} />

      <main className="main-content">
        {view === 'search' && (
          <>
            <SearchBar onSearch={handleSearch} />
            <SearchResults
              results={results}
              loading={loading}
              error={error}
              onSelectSong={handleSelectSong}
            />
          </>
        )}

        {view === 'viewer' && selectedSong && (
          <TabViewer song={selectedSong} onBack={handleBack} />
        )}

        {view === 'favorites' && (
          <FavoritesList onSelectSong={handleSelectSong} />
        )}
      </main>
    </div>
  );
}

export default App;
