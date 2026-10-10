import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { adminService } from '../services/adminService';
import { getErrorMessage } from '../services/api';
import { MEDIA_RULES } from '../utils/constants';
import { assetUrl, formatBytes } from '../utils/format';
import AudioPlayer from './AudioPlayer';

const kindOf = (file) => {
  const ext = file.name.split('.').pop().toLowerCase();
  return Object.keys(MEDIA_RULES).find((kind) => MEDIA_RULES[kind].exts.includes(ext)) || null;
};

/**
 * Pick -> validate -> preview -> upload with progress. Calls onChange(media | null).
 * `accept` is one of image | video | audio | any.
 */
export default function MediaUploader({ accept, value, onChange, onBusyChange, disabled }) {
  const inputRef = useRef(null);
  const abortRef = useRef(null);
  const [preview, setPreview] = useState(null); // { url, kind, name } of the local file while/after uploading
  const [progress, setProgress] = useState(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    onBusyChange?.(progress !== null);
  }, [progress, onBusyChange]);

  const kinds = accept === 'any' ? Object.keys(MEDIA_RULES) : [accept];
  const exts = kinds.flatMap((k) => MEDIA_RULES[k].exts);

  // Cancel an in-flight upload ONLY when the component unmounts.
  // (Do not tie this to preview changes: that cancelled every upload the moment a file was picked.)
  useEffect(() => () => abortRef.current?.abort(), []);

  // Free the local preview URL when it is replaced or the component unmounts.
  useEffect(() => {
    const url = preview?.url;
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [preview?.url]);

  const handleFile = async (file) => {
    if (!file) return;
    const kind = kindOf(file);
    if (!kind || !kinds.includes(kind)) {
      toast.error(`Unsupported file. Allowed: ${exts.join(', ').toUpperCase()}`);
      return;
    }
    const maxMb = MEDIA_RULES[kind].maxMb;
    if (file.size > maxMb * 1024 * 1024) {
      toast.error(`${kind[0].toUpperCase() + kind.slice(1)} files can be at most ${maxMb} MB (this one is ${formatBytes(file.size)}).`);
      return;
    }

    setPreview({ url: URL.createObjectURL(file), kind, name: file.name });
    setProgress(0);
    abortRef.current = new AbortController();
    try {
      const media = await adminService.uploadMedia(file, setProgress, abortRef.current.signal);
      onChange(media);
      toast.success('Upload complete');
    } catch (error) {
      if (error.code !== 'ERR_CANCELED') toast.error(`Upload failed: ${getErrorMessage(error)}`);
      setPreview(null);
      onChange(null);
    } finally {
      setProgress(null);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const remove = () => {
    abortRef.current?.abort();
    setPreview(null);
    setProgress(null);
    onChange(null);
  };

  const shown = preview || (value ? { url: assetUrl(value.url), kind: value.kind, name: value.originalName } : null);
  const uploading = progress !== null;

  return (
    <div className="uploader">
      {shown ? (
        <div className="uploader-preview">
          {shown.kind === 'image' && <img src={shown.url} alt={`Preview of ${shown.name || 'upload'}`} />}
          {shown.kind === 'video' && <video src={shown.url} controls preload="metadata" playsInline />}
          {shown.kind === 'audio' && <AudioPlayer src={shown.url} title={shown.name || 'Audio preview'} />}
          {uploading && (
            <div className="progress" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Upload progress">
              <div style={{ width: `${progress}%` }} />
              <span>Uploading {progress}%</span>
            </div>
          )}
          <div className="uploader-meta">
            <span className="truncate">{shown.name}</span>
            <span>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => inputRef.current?.click()} disabled={uploading || disabled}>Replace</button>{' '}
              <button type="button" className="btn btn-danger-ghost btn-sm" onClick={remove} disabled={disabled}>{uploading ? 'Cancel' : 'Remove'}</button>
            </span>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className={`dropzone${dragging ? ' is-dragging' : ''}`}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files?.[0]); }}
          disabled={disabled}
        >
          <span className="dropzone-icon" aria-hidden="true">⬆️</span>
          <strong>Choose a file or drop it here</strong>
          <small>{exts.join(', ').toUpperCase()}</small>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        hidden
        accept={exts.map((e) => `.${e}`).join(',')}
        onChange={(e) => handleFile(e.target.files?.[0])}
        aria-label="Upload media file"
      />
    </div>
  );
}
