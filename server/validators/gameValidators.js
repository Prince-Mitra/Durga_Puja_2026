const { z } = require('zod');
const { CONTENT_TYPES, INTERACTION_MODES, MAX_OPTIONS, LETTERS } = require('../utils/constants');

const emptyToNull = (value) => (value === '' || value === undefined ? null : value);

const optionalDate = z.preprocess(emptyToNull, z.coerce.date().nullable());

const settingsSchema = z
  .object({
    showResults: z.boolean().default(true),
    revealCorrectAnswer: z.boolean().default(true),
    allowMultipleAttempts: z.boolean().default(false),
    startsAt: optionalDate.default(null),
    endsAt: optionalDate.default(null),
  })
  .default({});

const gameBodySchema = z
  .object({
    title: z.string().trim().min(1, 'Title is required').max(120),
    description: z.string().trim().max(500).optional().default(''),
    contentType: z.enum(CONTENT_TYPES),
    interactionMode: z.enum(INTERACTION_MODES).optional(),
    // Client sends the object returned by the upload endpoint; only `key` is trusted (re-resolved server side).
    media: z.object({ key: z.string().min(1).max(100) }).passthrough().nullable().optional(),
    question: z.preprocess(emptyToNull, z.string().trim().max(300).nullable()).optional(),
    options: z.array(z.string().trim().min(1, 'Options cannot be empty').max(100)).max(MAX_OPTIONS).optional().default([]),
    correctAnswer: z.number().int().min(0).nullable().optional(),
    settings: settingsSchema.optional(),
    published: z.boolean().optional().default(false),
  })
  .superRefine((data, ctx) => {
    const issue = (path, message) => ctx.addIssue({ code: 'custom', path: [path], message });
    const mode = data.interactionMode ?? defaultMode(data.contentType);
    const mediaType = ['image', 'video', 'audio'].includes(data.contentType);

    if (mediaType && !data.media) issue('media', `Please upload ${data.contentType === 'image' ? 'an' : 'a'} ${data.contentType} file`);
    if ((data.contentType === 'quiz' || data.contentType === 'poll') && mode === 'none') {
      issue('interactionMode', 'Quizzes and polls need an interaction mode');
    }
    if (data.contentType === 'poll' && (mode === 'buzzer' || mode === 'firstCorrect')) {
      issue('interactionMode', 'Polls cannot use buzzer or first-correct mode');
    }

    if (mode !== 'none') {
      if (!data.question) issue('question', 'A question is required when players can answer');
      if (data.options.length < 2) issue('options', 'Add at least 2 options');
      if (new Set(data.options.map((o) => o.toLowerCase())).size !== data.options.length) {
        issue('options', 'Options must be unique');
      }
      if ((data.contentType === 'quiz' || mode === 'firstCorrect') && data.correctAnswer == null) {
        issue('correctAnswer', 'Choose the correct answer');
      }
      if (data.correctAnswer != null && data.correctAnswer >= data.options.length) {
        issue('correctAnswer', 'Correct answer must be one of the options');
      }
      if (data.contentType === 'poll' && data.correctAnswer != null) issue('correctAnswer', 'Polls have no correct answer');
    }

    const { startsAt, endsAt } = data.settings ?? {};
    if (startsAt && endsAt && endsAt <= startsAt) issue('settings', 'End time must be after the start time');
  });

const answerBodySchema = z
  .object({
    optionIndex: z.number().int().min(0).max(MAX_OPTIONS - 1).optional(),
    // Compatibility with the spec wording ("selectedAnswer: B"): a number or a letter.
    selectedAnswer: z
      .union([z.number().int().min(0).max(MAX_OPTIONS - 1), z.string().regex(/^[A-Ha-h]$/)])
      .optional(),
  })
  .refine((v) => v.optionIndex !== undefined || v.selectedAnswer !== undefined, 'Choose an option');

function defaultMode(contentType) {
  return contentType === 'quiz' || contentType === 'poll' ? 'normal' : 'none';
}

function resolveOptionIndex(body) {
  if (body.optionIndex !== undefined) return body.optionIndex;
  return typeof body.selectedAnswer === 'string' ? LETTERS.indexOf(body.selectedAnswer.toUpperCase()) : body.selectedAnswer;
}

/** Turns validated input into the exact shape stored in Mongo (drops fields that make no sense for the mode). */
function normalizeGameInput(data) {
  const mode = data.interactionMode ?? defaultMode(data.contentType);
  const interactive = mode !== 'none';
  const settings = data.settings ?? {};
  return {
    title: data.title,
    description: data.description ?? '',
    contentType: data.contentType,
    interactionMode: mode,
    question: interactive ? data.question : data.question || null,
    options: interactive ? data.options : [],
    correctAnswer: interactive && data.contentType !== 'poll' ? data.correctAnswer ?? null : null,
    settings: {
      showResults: settings.showResults ?? true,
      revealCorrectAnswer: settings.revealCorrectAnswer ?? true,
      allowMultipleAttempts: mode === 'normal' ? settings.allowMultipleAttempts ?? false : false,
      startsAt: settings.startsAt ?? null,
      endsAt: settings.endsAt ?? null,
    },
    published: data.published ?? false,
  };
}

module.exports = { gameBodySchema, answerBodySchema, normalizeGameInput, resolveOptionIndex };
