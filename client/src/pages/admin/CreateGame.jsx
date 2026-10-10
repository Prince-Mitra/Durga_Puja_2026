import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { adminService } from '../../services/adminService';
import { getErrorMessage } from '../../services/api';
import { useFetch } from '../../hooks/useFetch';
import { MODE_META, PRESETS } from '../../utils/constants';
import { toLocalInput } from '../../utils/format';
import MediaUploader from '../../components/MediaUploader';
import OptionsEditor from '../../components/OptionsEditor';
import { ErrorState, Loading } from '../../components/States';

const MODE_ICON = { firstCorrect: '🎯', buzzer: '⚡', normal: '🗳️' };

const EMPTY_FORM = {
  title: '',
  description: '',
  media: null,
  question: '',
  options: ['', '', '', ''],
  correctAnswer: null,
  interactionMode: 'none',
  showResults: true,
  revealCorrectAnswer: true,
  allowMultipleAttempts: false,
  startsAt: '',
  endsAt: '',
  published: true,
};

/** Maps ?type=poll / ?type=image (dashboard quick actions) to a preset. */
const presetFromQuery = (type) =>
  PRESETS.find((p) => p.id === type) || PRESETS.find((p) => p.contentType === type && p.modes.length === 1) || null;

/** Works out which preset an existing game belongs to (edit mode). */
const presetOfGame = (game) => {
  if (game.contentType === 'quiz' || game.contentType === 'poll') return PRESETS.find((p) => p.id === game.contentType);
  return PRESETS.find((p) => p.contentType === game.contentType && (game.interactionMode === 'none' ? p.modes.length === 1 : p.modes.length > 1));
};

const formFromGame = (game) => ({
  title: game.title,
  description: game.description,
  media: game.media,
  question: game.question || '',
  options: game.options.length ? game.options : ['', '', '', ''],
  correctAnswer: game.correctAnswer,
  interactionMode: game.interactionMode,
  showResults: game.settings.showResults,
  revealCorrectAnswer: game.settings.revealCorrectAnswer,
  allowMultipleAttempts: game.settings.allowMultipleAttempts,
  startsAt: toLocalInput(game.settings.startsAt),
  endsAt: toLocalInput(game.settings.endsAt),
  published: game.published,
});

/** Defined at module level on purpose: a component declared inside render would remount (and lose focus) on every keystroke. */
function Field({ name, label, children, hint, error }) {
  return (
    <div className={`field${error ? ' has-error' : ''}`}>
      <label className="label" htmlFor={name}>{label}</label>
      {children}
      {hint && !error && <p className="hint">{hint}</p>}
      {error && <p className="field-error" role="alert">{error}</p>}
    </div>
  );
}

export default function CreateGame() {
  const { id } = useParams(); // present on /admin/edit/:id
  const editing = Boolean(id);
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const existing = useFetch(() => (editing ? adminService.getGame(id) : Promise.resolve(null)), [id]);
  const [preset, setPreset] = useState(() => (editing ? null : presetFromQuery(params.get('type'))));
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState({});

  // Fill the form when editing.
  useEffect(() => {
    if (existing.data) {
      setPreset(presetOfGame(existing.data));
      setForm(formFromGame(existing.data));
    }
  }, [existing.data]);

  // Apply the preset's default interaction mode when picked on the create screen.
  useEffect(() => {
    if (preset && !editing) setForm((f) => ({ ...EMPTY_FORM, ...f, interactionMode: preset.mode }));
  }, [preset, editing]);

  const set = (patch) => {
    setForm((f) => ({ ...f, ...patch }));
    setErrors((e) => Object.fromEntries(Object.entries(e).filter(([k]) => !(k in patch))));
  };

  const interactive = form.interactionMode !== 'none';
  const isMediaType = preset && ['image', 'video', 'audio'].includes(preset.contentType);
  const isPoll = preset?.contentType === 'poll';
  const isQuiz = preset?.contentType === 'quiz';
  const showCorrect = interactive && !isPoll;
  const mediaAccept = useMemo(() => (isMediaType ? preset.contentType : 'any'), [isMediaType, preset]);

  const validate = () => {
    const next = {};
    if (!form.title.trim()) next.title = 'Title is required';
    if (isMediaType && !form.media) next.media = 'Please upload a file';
    if (interactive) {
      if (!form.question.trim()) next.question = 'Add the question players will see';
      const filled = form.options.map((o) => o.trim());
      if (filled.some((o) => !o)) next.options = 'Fill in or remove empty options';
      else if (filled.length < 2) next.options = 'Add at least 2 options';
      else if (new Set(filled.map((o) => o.toLowerCase())).size !== filled.length) next.options = 'Options must be different';
      if ((isQuiz || form.interactionMode === 'firstCorrect') && form.correctAnswer == null) next.correctAnswer = 'Choose the correct answer';
    }
    if (form.startsAt && form.endsAt && new Date(form.endsAt) <= new Date(form.startsAt)) next.endsAt = 'End must be after start';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async (event) => {
    event.preventDefault();
    if (uploading) return toast.error('Wait for the upload to finish');
    if (!validate()) return toast.error('Please fix the highlighted fields');

    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      contentType: preset.contentType,
      interactionMode: form.interactionMode,
      media: form.media ? { key: form.media.key } : null,
      question: interactive ? form.question.trim() : form.question.trim() || null,
      options: interactive ? form.options.map((o) => o.trim()) : [],
      correctAnswer: showCorrect ? form.correctAnswer : null,
      published: form.published,
      settings: {
        showResults: form.showResults,
        revealCorrectAnswer: form.revealCorrectAnswer,
        allowMultipleAttempts: form.interactionMode === 'normal' && form.allowMultipleAttempts,
        startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
        endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
      },
    };

    setSaving(true);
    try {
      if (editing) await adminService.updateGame(id, payload);
      else await adminService.createGame(payload);
      toast.success(editing ? 'Game updated' : 'Game created successfully 🎉');
      navigate('/admin/games');
    } catch (error) {
      const details = error.response?.data?.error?.details;
      if (details?.length) {
        setErrors(Object.fromEntries(details.filter((d) => d.field).map((d) => [d.field.split('.')[0], d.message])));
      }
      toast.error(getErrorMessage(error, 'Could not save the game'));
    } finally {
      setSaving(false);
    }
  };

  if (editing && existing.loading) return <Loading label="Loading game..." />;
  if (editing && existing.error) return <ErrorState message={existing.error} onRetry={existing.reload} />;

  /* ---------- Step 1: choose content type ---------- */
  if (!preset) {
    return (
      <>
        <h1 className="page-title">Create game</h1>
        <h2 className="section-title">Choose content type</h2>
        <div className="type-grid">
          {PRESETS.map((p) => (
            <button key={p.id} type="button" className="type-tile" onClick={() => setPreset(p)}>
              <span aria-hidden="true">{p.icon}</span>
              <strong>{p.label}</strong>
              <small>
                {p.modes.length === 1 && p.modes[0] === 'none' ? 'Just show it' : p.contentType === 'poll' ? 'Everyone votes' : p.contentType === 'quiz' ? 'Multiple choice' : 'Players guess'}
              </small>
            </button>
          ))}
        </div>
      </>
    );
  }

  /* ---------- Step 2: the form ---------- */
  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">{editing ? 'Edit game' : 'Create game'}</h1>
          <p className="hint">{preset.icon} {preset.label}</p>
        </div>
        {!editing && <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPreset(null)}>Change type</button>}
      </div>

      <form className="card form" onSubmit={submit} noValidate>
        <Field name="title" error={errors.title} label="Title">
          <input id="title" className="input" value={form.title} maxLength={120} onChange={(e) => set({ title: e.target.value })} placeholder="Guess the Player" />
        </Field>

        <Field name="description" error={errors.description} label="Description (optional)">
          <input id="description" className="input" value={form.description} maxLength={500} onChange={(e) => set({ description: e.target.value })} placeholder="Can you identify this player?" />
        </Field>

        <Field name="media" error={errors.media} label={isMediaType ? `Upload ${preset.contentType}` : 'Media (optional)'} hint={!isMediaType ? 'Add an image, video or audio clip to show with the question.' : undefined}>
          <MediaUploader accept={mediaAccept} value={form.media} onChange={(media) => set({ media })} onBusyChange={setUploading} disabled={saving} />
        </Field>

        {preset.modes.length > 1 && (
          <fieldset className="field">
            <legend className="label">Interaction mode</legend>
            <div className="radio-cards">
              {preset.modes.map((mode) => (
                <label key={mode} className={`radio-card${form.interactionMode === mode ? ' is-selected' : ''}`}>
                  <input type="radio" name="mode" value={mode} checked={form.interactionMode === mode} onChange={() => set({ interactionMode: mode })} />
                  <strong>{MODE_ICON[mode]} {MODE_META[mode].label}</strong>
                  <small>{MODE_META[mode].hint}</small>
                </label>
              ))}
            </div>
          </fieldset>
        )}

        {interactive && (
          <>
            <Field name="question" error={errors.question} label="Question">
              <input id="question" className="input" value={form.question} maxLength={300} onChange={(e) => set({ question: e.target.value })} placeholder="Who is this?" />
            </Field>

            <Field name="options" error={errors.options} label="Options" hint={showCorrect ? 'Tick the ✓ next to the correct answer.' : 'Players pick one.'}>
              <OptionsEditor
                options={form.options}
                onChange={(options) => set({ options })}
                correctAnswer={form.correctAnswer}
                onCorrectChange={(correctAnswer) => set({ correctAnswer })}
                showCorrect={showCorrect}
              />
            </Field>
            {errors.correctAnswer && <p className="field-error" role="alert">{errors.correctAnswer}</p>}
          </>
        )}

        {!interactive && (
          <Field name="question" error={errors.question} label="Caption (optional)">
            <input id="question" className="input" value={form.question} maxLength={300} onChange={(e) => set({ question: e.target.value })} placeholder="Shown under the media" />
          </Field>
        )}

        {interactive && (
          <fieldset className="field">
            <legend className="label">Settings</legend>
            <label className="check"><input type="checkbox" checked={form.showResults} onChange={(e) => set({ showResults: e.target.checked })} /> Show results to players</label>
            {showCorrect && (
              <label className="check"><input type="checkbox" checked={form.revealCorrectAnswer} onChange={(e) => set({ revealCorrectAnswer: e.target.checked })} /> Reveal the correct answer after answering</label>
            )}
            {form.interactionMode === 'normal' && (
              <label className="check"><input type="checkbox" checked={form.allowMultipleAttempts} onChange={(e) => set({ allowMultipleAttempts: e.target.checked })} /> Allow multiple attempts</label>
            )}
          </fieldset>
        )}

        <div className="two-col">
          <Field name="startsAt" error={errors.startsAt} label="Starts at (optional)">
            <input id="startsAt" type="datetime-local" className="input" value={form.startsAt} onChange={(e) => set({ startsAt: e.target.value })} />
          </Field>
          <Field name="endsAt" error={errors.endsAt} label="Ends at (optional)">
            <input id="endsAt" type="datetime-local" className="input" value={form.endsAt} onChange={(e) => set({ endsAt: e.target.value })} />
          </Field>
        </div>

        <label className="check check-lg">
          <input type="checkbox" checked={form.published} onChange={(e) => set({ published: e.target.checked })} /> {editing ? 'Published' : 'Publish immediately'}
        </label>

        {editing && (
          <p className="hint">Changing the options, correct answer or interaction mode clears existing answers and re-opens the question.</p>
        )}

        <div className="form-actions">
          <Link to="/admin/games" className="btn btn-ghost">Cancel</Link>
          <button type="submit" className="btn btn-primary btn-lg" disabled={saving || uploading}>
            {saving ? 'Saving...' : editing ? 'SAVE CHANGES' : 'CREATE GAME'}
          </button>
        </div>
      </form>
    </>
  );
}
