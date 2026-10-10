import { QRCodeSVG } from 'qrcode.react';
import toast from 'react-hot-toast';
import Modal from './Modal';
import { shareUrl } from '../utils/format';

/** "Scan to play" - shows a QR code for a game (or the live page) so a room full of people can join in seconds. */
export default function QRModal({ path, title, onClose }) {
  const url = shareUrl(path);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied');
    } catch {
      window.prompt('Copy this link:', url);
    }
  };

  return (
    <Modal title="Scan to Play" onClose={onClose}>
      <p className="modal-text center">{title}</p>
      <div className="qr-box">
        <QRCodeSVG value={url} size={240} level="M" includeMargin bgColor="#ffffff" fgColor="#0b1020" />
      </div>
      <p className="qr-url">{url}</p>
      <p className="hint center">
        {/localhost|127\.0\.0\.1/.test(url) && 'Heads up: "localhost" only works on this computer. Open the site via your LAN IP or deployed URL to scan from phones.'}
      </p>
      <div className="modal-actions">
        <button type="button" className="btn btn-ghost" onClick={copy}>Copy link</button>
        <button type="button" className="btn btn-primary" onClick={onClose}>Done</button>
      </div>
    </Modal>
  );
}
