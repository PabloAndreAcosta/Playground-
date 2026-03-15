import type { SongsterrSong } from '../types';

interface SearchResultsProps {
  results: SongsterrSong[];
  loading: boolean;
  error: string | null;
  onSelectSong: (song: SongsterrSong) => void;
}

export default function SearchResults({ results, loading, error, onSelectSong }: SearchResultsProps) {
  if (loading) {
    return <div className="loading">Söker...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  if (results.length === 0) {
    return <div className="empty-state">Sök efter en låt för att börja</div>;
  }

  return (
    <ul className="results-list">
      {results.map((song) => (
        <li key={song.id} className="result-item" onClick={() => onSelectSong(song)}>
          <div className="result-title">{song.title}</div>
          <div className="result-artist">{song.artist.name}</div>
          {song.tabTypes && song.tabTypes.length > 0 && (
            <div className="result-tags">
              {song.tabTypes.map((t) => (
                <span key={t} className="tag">{t}</span>
              ))}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
