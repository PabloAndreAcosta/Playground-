export interface SongsterrSong {
  id: number;
  title: string;
  artist: {
    id: number;
    name: string;
    nameWithoutThePrefix: string;
  };
  chordsPresent: boolean;
  tabTypes: string[];
}

export interface FavoriteSong {
  songId: number;
  title: string;
  artist: string;
  savedAt: number;
}

export type View = 'search' | 'viewer' | 'favorites';
