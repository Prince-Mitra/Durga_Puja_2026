import { LETTERS, MAX_OPTIONS } from '../utils/constants';

/** Editable list of answer options (2-8). Removing an option keeps the "correct" index consistent. */
export default function OptionsEditor({ options, onChange, correctAnswer, onCorrectChange, showCorrect }) {
  const update = (index, value) => onChange(options.map((o, i) => (i === index ? value : o)));

  const remove = (index) => {
    onChange(options.filter((_, i) => i !== index));
    if (correctAnswer === index) onCorrectChange(null);
    else if (correctAnswer != null && correctAnswer > index) onCorrectChange(correctAnswer - 1);
  };

  return (
    <div className="options-editor">
      {options.map((option, index) => (
        <div className="options-row" key={index}>
          <span className="option-letter" aria-hidden="true">{LETTERS[index]}</span>
          <input
            className="input"
            value={option}
            maxLength={100}
            placeholder={`Option ${LETTERS[index]}`}
            aria-label={`Option ${LETTERS[index]}`}
            onChange={(e) => update(index, e.target.value)}
          />
          {showCorrect && (
            <label className="correct-pick" title="Mark as correct answer">
              <input
                type="radio"
                name="correct"
                checked={correctAnswer === index}
                onChange={() => onCorrectChange(index)}
                aria-label={`Mark option ${LETTERS[index]} as correct`}
              />
              <span>✓</span>
            </label>
          )}
          <button
            type="button"
            className="icon-btn icon-btn-danger"
            onClick={() => remove(index)}
            disabled={options.length <= 2}
            aria-label={`Remove option ${LETTERS[index]}`}
          >
            ✕
          </button>
        </div>
      ))}
      {options.length < MAX_OPTIONS && (
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => onChange([...options, ''])}>
          + Add option
        </button>
      )}
    </div>
  );
}
