import toast from 'react-hot-toast';
import { shareUrl } from '../utils/format';

/** Web Share API on phones, "copy link" everywhere else. */
export default function ShareButton({ path, title, className = 'btn btn-ghost btn-sm', label = '🔗 Share Game' }) {
  const share = async () => {
    const url = shareUrl(path);
    if (navigator.share) {
      try {
        await navigator.share({ title, text: `Play "${title}" on বাগমারা যুবগোষ্ঠী ক্লাব`, url });
        return;
      } catch (error) {
        if (error?.name === 'AbortError') return; // user closed the share sheet
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied');
    } catch {
      window.prompt('Copy this link:', url);
    }
  };

  return (
    <button type="button" className={className} onClick={share}>
      {label}
    </button>
  );
}
