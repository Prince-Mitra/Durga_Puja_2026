import { useEffect, useRef, useState } from 'react';
import { formatTime } from '../utils/format';

/** Custom audio player: big play button, seekable progress, time. Uses a hidden <audio> underneath. */
export default function AudioPlayer({ src, title = 'Audio clip' }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return undefined;
    const handlers = {
      play: () => setPlaying(true),
      pause: () => setPlaying(false),
      ended: () => setPlaying(false),
      timeupdate: () => setCurrent(audio.currentTime),
      loadedmetadata: () => setDuration(audio.duration),
      error: () => setFailed(true),
    };
    Object.entries(handlers).forEach(([event, fn]) => audio.addEventListener(event, fn));
    return () => Object.entries(handlers).forEach(([event, fn]) => audio.removeEventListener(event, fn));
  }, [src]);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) audio.play().catch(() => setFailed(true));
    else audio.pause();
  };

  const seek = (event) => {
    const value = Number(event.target.value);
    audioRef.current.currentTime = value;
    setCurrent(value);
  };

  if (failed) return <p className="media-error">This audio could not be played.</p>;

  return (
    <div className="audio-player">
      {/* preload="none": nothing is downloaded until the player presses play */}
      <audio ref={audioRef} src={src} preload="none" />
      <button type="button" className="audio-play" onClick={toggle} aria-label={playing ? `Pause ${title}` : `Play ${title}`}>
        {playing ? '⏸' : '▶'}
      </button>
      <div className="audio-body">
        <div className={`audio-bars${playing ? ' is-playing' : ''}`} aria-hidden="true">
          {Array.from({ length: 18 }, (_, i) => (
            <span key={i} style={{ animationDelay: `${(i % 6) * 0.12}s` }} />
          ))}
        </div>
        <input
          type="range"
          className="audio-range"
          min="0"
          max={duration || 0}
          step="0.1"
          value={current}
          onChange={seek}
          aria-label="Seek"
          disabled={!duration}
        />
        <div className="audio-time">
          <span>{formatTime(current)}</span>
          <span>{duration ? formatTime(duration) : '--:--'}</span>
        </div>
      </div>
    </div>
  );
}
