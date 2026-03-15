interface PlayerControlsProps {
  isPlaying: boolean;
  isReady: boolean;
  tempo: number;
  volume: number;
  onPlayPause: () => void;
  onStop: () => void;
  onTempoChange: (tempo: number) => void;
  onVolumeChange: (volume: number) => void;
}

export default function PlayerControls({
  isPlaying,
  isReady,
  tempo,
  volume,
  onPlayPause,
  onStop,
  onTempoChange,
  onVolumeChange,
}: PlayerControlsProps) {
  return (
    <div className="player-controls">
      <div className="player-buttons">
        <button
          className="control-btn stop-btn"
          onClick={onStop}
          disabled={!isReady}
          title="Stopp"
        >
          &#9632;
        </button>
        <button
          className="control-btn play-btn"
          onClick={onPlayPause}
          disabled={!isReady}
          title={isPlaying ? 'Paus' : 'Spela'}
        >
          {isPlaying ? '\u23F8' : '\u25B6'}
        </button>
      </div>

      <div className="player-sliders">
        <label className="slider-label">
          <span>Tempo: {Math.round(tempo * 100)}%</span>
          <input
            type="range"
            min="0.25"
            max="2"
            step="0.05"
            value={tempo}
            onChange={(e) => onTempoChange(parseFloat(e.target.value))}
            disabled={!isReady}
          />
        </label>
        <label className="slider-label">
          <span>Volym: {Math.round(volume * 100)}%</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
            disabled={!isReady}
          />
        </label>
      </div>
    </div>
  );
}
