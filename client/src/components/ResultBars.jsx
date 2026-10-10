import { useEffect, useState } from 'react';
import { LETTERS } from '../utils/constants';

/** Animated horizontal bars. `highlight` marks the viewer's choice, `correct` the right answer. */
export default function ResultBars({ options = [], total = 0, highlight = null, correct = null }) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const leader = options.reduce((max, o) => Math.max(max, o.votes), 0);

  return (
    <div className="bars" role="list" aria-label="Results">
      {options.map((option) => (
        <div
          key={option.index}
          role="listitem"
          className={`bar${option.index === highlight ? ' is-mine' : ''}${option.index === correct ? ' is-correct' : ''}${
            leader > 0 && option.votes === leader ? ' is-leader' : ''
          }`}
        >
          <div className="bar-head">
            <span className="bar-label">
              <b>{LETTERS[option.index]}</b> {option.text}
              {option.index === highlight && <em> · your pick</em>}
              {option.index === correct && <em> · correct</em>}
            </span>
            <span className="bar-value">
              {option.votes} <small>({option.percent}%)</small>
            </span>
          </div>
          <div className="bar-track">
            <div className="bar-fill" style={{ width: shown ? `${option.percent}%` : '0%' }} />
          </div>
        </div>
      ))}
      <p className="bars-total">
        {total} {total === 1 ? 'response' : 'responses'}
      </p>
    </div>
  );
}
