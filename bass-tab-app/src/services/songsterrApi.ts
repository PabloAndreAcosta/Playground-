import type { SongsterrSong } from '../types';

const CORS_PROXY = 'https://api.allorigins.win/raw?url=';

function buildUrl(path: string): string {
  const songsterrUrl = `https://www.songsterr.com${path}`;
  if (import.meta.env.DEV) {
    return `/api/songsterr${path}`;
  }
  return `${CORS_PROXY}${encodeURIComponent(songsterrUrl)}`;
}

export async function searchSongs(query: string): Promise<SongsterrSong[]> {
  if (!query.trim()) return [];
  const url = buildUrl(`/a/ra/songs.json?pattern=${encodeURIComponent(query)}`);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Search failed: ${response.status}`);
  return response.json();
}

export function getSongsterrTabUrl(songId: number): string {
  return `https://www.songsterr.com/a/wa/song?id=${songId}`;
}

export function getSongsterrEmbedUrl(songId: number): string {
  return `https://www.songsterr.com/a/wa/song?id=${songId}`;
}
