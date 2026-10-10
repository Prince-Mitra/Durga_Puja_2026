import { assetUrl } from '../utils/format';
import AudioPlayer from './AudioPlayer';

/** Renders whatever media a game has: image, video or audio. Large videos load metadata only until played. */
export default function MediaView({ media, title, className = '' }) {
  if (!media?.url) return null;
  const src = assetUrl(media.url);

  if (media.kind === 'image') {
    return (
      <div className={`media-frame ${className}`}>
        <img src={src} alt={title || media.originalName || 'Game image'} loading="lazy" decoding="async" />
      </div>
    );
  }
  if (media.kind === 'video') {
    return (
      <div className={`media-frame ${className}`}>
        <video src={src} controls playsInline preload="metadata" aria-label={title || 'Game video'} />
      </div>
    );
  }
  if (media.kind === 'audio') {
    return (
      <div className={`media-frame media-audio ${className}`}>
        <AudioPlayer src={src} title={title} />
      </div>
    );
  }
  return null;
}
