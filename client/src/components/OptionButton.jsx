import { LETTERS } from '../utils/constants';

const ICONS = { correct: '✅', wrong: '❌', locked: '🔒', picked: '👆' };

/**
 * One answer choice. `state`:
 *  idle | selected | pending | correct | wrong | locked | disabled
 * Large touch target (min 56px), keyboard focusable, announces its state to screen readers.
 */
export default function OptionButton({ index, text, state = 'idle', onClick }) {
  const interactive = state === 'idle' || state === 'selected';
  return (
    <button
      type="button"
      className={`option option-${state}`}
      onClick={onClick}
      disabled={!interactive}
      aria-pressed={state === 'selected'}
      aria-label={`${LETTERS[index]}. ${text}${state === 'correct' ? ' (correct)' : state === 'wrong' ? ' (wrong)' : state === 'locked' ? ' (locked)' : ''}`}
    >
      <span className="option-letter" aria-hidden="true">{LETTERS[index]}</span>
      <span className="option-text">{text}</span>
      <span className="option-icon" aria-hidden="true">
        {state === 'pending' ? <span className="spinner spinner-sm" /> : ICONS[state] || ''}
      </span>
    </button>
  );
}
