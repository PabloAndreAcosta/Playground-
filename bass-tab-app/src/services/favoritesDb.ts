import { openDB, type DBSchema } from 'idb';
import type { FavoriteSong } from '../types';

interface BassTabDB extends DBSchema {
  favorites: {
    key: number;
    value: FavoriteSong;
    indexes: { 'by-date': number };
  };
}

const DB_NAME = 'bass-tab-book';
const DB_VERSION = 1;

function getDb() {
  return openDB<BassTabDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      const store = db.createObjectStore('favorites', { keyPath: 'songId' });
      store.createIndex('by-date', 'savedAt');
    },
  });
}

export async function addFavorite(song: FavoriteSong): Promise<void> {
  const db = await getDb();
  await db.put('favorites', song);
}

export async function removeFavorite(songId: number): Promise<void> {
  const db = await getDb();
  await db.delete('favorites', songId);
}

export async function getAllFavorites(): Promise<FavoriteSong[]> {
  const db = await getDb();
  const all = await db.getAllFromIndex('favorites', 'by-date');
  return all.reverse();
}

export async function isFavorite(songId: number): Promise<boolean> {
  const db = await getDb();
  const item = await db.get('favorites', songId);
  return !!item;
}
