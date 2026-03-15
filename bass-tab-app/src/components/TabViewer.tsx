import { useEffect, useRef, useState, useCallback } from 'react';
import type { SongsterrSong } from '../types';
import { addFavorite, removeFavorite, isFavorite } from '../services/favoritesDb';
import PlayerControls from './PlayerControls';

interface TabViewerProps {
  song: SongsterrSong;
  onBack: () => void;
}

export default function TabViewer({ song, onBack }: TabViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isFav, setIsFav] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tempo, setTempo] = useState(1);
  const [volume, setVolume] = useState(1);

  useEffect(() => {
    isFavorite(song.id).then(setIsFav);
  }, [song.id]);

  useEffect(() => {
    if (!containerRef.current) return;

    let destroyed = false;

    async function initAlphaTab() {
      try {
        const alphaTabModule = await import('@coderline/alphatab');

        if (destroyed || !containerRef.current) return;

        const settings = new alphaTabModule.Settings();
        settings.core.fontDirectory = '/font/';
        settings.player.enablePlayer = true;
        settings.player.enableCursor = true;
        settings.player.enableUserInteraction = true;
        settings.player.soundFont = '/soundfont/sonivox.sf2';
        settings.display.layoutMode = alphaTabModule.LayoutMode.Page;

        const api = new alphaTabModule.AlphaTabApi(containerRef.current!, settings);
        apiRef.current = api;

        api.scoreLoaded.on(() => {
          if (!destroyed) {
            setIsReady(true);
            // Try to select bass track
            if (api.score) {
              const bassTrack = api.score.tracks.find(
                (t: any) =>
                  t.name.toLowerCase().includes('bass') ||
                  t.playbackInfo.program >= 32 && t.playbackInfo.program <= 39
              );
              if (bassTrack) {
                api.renderTracks([bassTrack]);
              }
            }
          }
        });

        api.playerStateChanged.on((e: any) => {
          if (!destroyed) {
            setIsPlaying(e.state === 1); // 1 = Playing
          }
        });

        api.renderStarted.on(() => {
          if (!destroyed) setLoadError(null);
        });

        // Load tab from Songsterr - use the embed/download approach
        // Songsterr serves GP files at a predictable URL pattern
        const tabUrl = `https://www.songsterr.com/a/ra/player/song/${song.id}.gp`;

        // Use CORS proxy for production
        const proxyUrl = import.meta.env.DEV
          ? `/api/songsterr/a/ra/player/song/${song.id}.gp`
          : `https://api.allorigins.win/raw?url=${encodeURIComponent(tabUrl)}`;

        try {
          const response = await fetch(proxyUrl);
          if (!response.ok) throw new Error(`Failed to fetch tab: ${response.status}`);
          const arrayBuffer = await response.arrayBuffer();
          if (!destroyed) {
            api.load(new Uint8Array(arrayBuffer));
          }
        } catch (fetchErr) {
          // Fallback: try loading via AlphaTex demo
          if (!destroyed) {
            api.tex(
              `\\title "${song.title}"
\\artist "${song.artist.name}"
\\tuning E1 A1 D2 G2
.
:4 0.1 2.1 3.1 0.1 | 0.2 2.2 3.2 0.2 |
0.3 2.3 3.3 0.3 | 0.4 2.4 3.4 0.4`
            );
            setLoadError('Kunde inte ladda tablatur från Songsterr. Visar demo-tablatur.');
          }
        }
      } catch (err) {
        if (!destroyed) {
          setLoadError(`Kunde inte initiera alphaTab: ${err}`);
        }
      }
    }

    initAlphaTab();

    return () => {
      destroyed = true;
      if (apiRef.current) {
        apiRef.current.destroy();
        apiRef.current = null;
      }
    };
  }, [song.id, song.title, song.artist.name]);

  const handlePlayPause = useCallback(() => {
    apiRef.current?.playPause();
  }, []);

  const handleStop = useCallback(() => {
    apiRef.current?.stop();
  }, []);

  const handleTempoChange = useCallback((newTempo: number) => {
    setTempo(newTempo);
    if (apiRef.current) {
      apiRef.current.playbackSpeed = newTempo;
    }
  }, []);

  const handleVolumeChange = useCallback((newVolume: number) => {
    setVolume(newVolume);
    if (apiRef.current) {
      apiRef.current.masterVolume = newVolume;
    }
  }, []);

  const toggleFavorite = useCallback(async () => {
    if (isFav) {
      await removeFavorite(song.id);
      setIsFav(false);
    } else {
      await addFavorite({
        songId: song.id,
        title: song.title,
        artist: song.artist.name,
        savedAt: Date.now(),
      });
      setIsFav(true);
    }
  }, [isFav, song]);

  return (
    <div className="tab-viewer">
      <div className="tab-viewer-header">
        <button className="back-btn" onClick={onBack}>&larr; Tillbaka</button>
        <div className="tab-viewer-info">
          <h2>{song.title}</h2>
          <p>{song.artist.name}</p>
        </div>
        <button
          className={`fav-btn ${isFav ? 'is-fav' : ''}`}
          onClick={toggleFavorite}
          title={isFav ? 'Ta bort favorit' : 'Spara som favorit'}
        >
          {isFav ? '\u2605' : '\u2606'}
        </button>
      </div>

      {loadError && <div className="warning-message">{loadError}</div>}

      {!isReady && !loadError && (
        <div className="loading">Laddar tablatur...</div>
      )}

      <div
        ref={containerRef}
        className="alphatab-container"
        style={{ minHeight: isReady ? undefined : '200px' }}
      />

      <PlayerControls
        isPlaying={isPlaying}
        isReady={isReady}
        tempo={tempo}
        volume={volume}
        onPlayPause={handlePlayPause}
        onStop={handleStop}
        onTempoChange={handleTempoChange}
        onVolumeChange={handleVolumeChange}
      />
    </div>
  );
}
