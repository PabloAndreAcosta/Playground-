import { useEffect, useState } from 'react';
import type { FavoriteSong, SongsterrSong } from '../types';
import { getAllFavorites, removeFavorite } from '../services/favoritesDb';

interface FavoritesListProps {
  onSelectSong: (song: SongsterrSong) => void;
}

export default function FavoritesList({ onSelectSong }: FavoritesListProps) {
  const [favorites, setFavorites] = useState<FavoriteSong[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFavorites();
  }, []);

  async function loadFavorites() {
    setLoading(true);
    const favs = await getAllFavorites();
    setFavorites(favs);
    setLoading(false);
  }

  async function handleRemove(e: React.MouseEvent, songId: number) {
    e.stopPropagation();
    await removeFavorite(songId);
    setFavorites((prev) => prev.filter((f) => f.songId !== songId));
  }

  function handleSelect(fav: FavoriteSong) {
    const song: SongsterrSong = {
      id: fav.songId,
      title: fav.title,
      artist: { id: 0, name: fav.artist, nameWithoutThePrefix: fav.artist },
      chordsPresent: false,
      tabTypes: [],
    };
    onSelectSong(song);
  }

  if (loading) {
    return <div className="loading">Laddar favoriter...</div>;
  }

  if (favorites.length === 0) {
    return (
      <div className="empty-state">
        <p>Inga favoriter sparade ännu.</p>
        <p>Sök efter låtar och spara dina favoriter!</p>
      </div>
    );
  }

  return (
    <ul className="results-list">
      {favorites.map((fav) => (
        <li key={fav.songId} className="result-item" onClick={() => handleSelect(fav)}>
          <div className="result-title">{fav.title}</div>
          <div className="result-artist">{fav.artist}</div>
          <div className="result-meta">
            <span className="saved-date">
              Sparad {new Date(fav.savedAt).toLocaleDateString('sv-SE')}
            </span>
            <button
              className="remove-btn"
              onClick={(e) => handleRemove(e, fav.songId)}
              title="Ta bort"
            >
              &times;
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
