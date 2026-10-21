import type {
  ResumeEditorState,
  ResumeParagraph,
  ResumeParagraphInput,
  ResumeSlot,
} from './types';

export function createResumeEditor(text: string): ResumeEditorState {
  return {
    paragraphs: text
      .split(/\r?\n+/)
      .filter((line) => line.trim())
      .map((line, index) => ({
        id: `p_${index + 1}`,
        text: line,
        originalText: line,
        state: 'Original',
        isLocked: false,
        revision: 0,
      })),
    slots: [],
  };
}

export function editorText(editor: ResumeEditorState) {
  return editor.paragraphs.map((paragraph) => paragraph.text).join('\n');
}

export function editResumeParagraph(
  editor: ResumeEditorState,
  id: string,
  text: string
): ResumeEditorState {
  return {
    ...editor,
    paragraphs: editor.paragraphs.map((paragraph) =>
      paragraph.id === id
        ? {
            ...paragraph,
            text,
            state: 'User_Edited',
            isLocked: true,
            revision: paragraph.revision + 1,
          }
        : paragraph
    ),
  };
}

export function referencedSlots(text: string, slots: ResumeSlot[]) {
  return slots.filter((slot) => text.includes(`{{${slot.id}}}`));
}

export function mergeResumeRewrites(
  current: ResumeEditorState,
  snapshot: ResumeParagraph[],
  rewrites: ResumeParagraphInput[],
  slots: ResumeSlot[],
  overrideLocked = false
): ResumeEditorState {
  const requested = new Map(
    snapshot.map((paragraph) => [paragraph.id, paragraph])
  );
  const replacements = new Map(
    rewrites.map((paragraph) => [paragraph.id, paragraph.text])
  );
  const paragraphs = current.paragraphs.map((paragraph): ResumeParagraph => {
    const previous = requested.get(paragraph.id);
    const replacement = replacements.get(paragraph.id);
    if (
      !previous ||
      replacement === undefined ||
      paragraph.revision !== previous.revision ||
      (paragraph.isLocked && !overrideLocked)
    )
      return paragraph;
    return {
      ...paragraph,
      text: replacement,
      state: 'AI_Optimized',
      isLocked: false,
      revision: paragraph.revision + 1,
    };
  });
  const allSlots = new Map(
    [...current.slots, ...slots].map((slot) => [slot.id, slot])
  );
  return {
    paragraphs,
    slots: referencedSlots(
      paragraphs.map((paragraph) => paragraph.text).join('\n'),
      [...allSlots.values()]
    ),
  };
}

export function resolveResumeSlot(
  editor: ResumeEditorState,
  id: string,
  value: string
): ResumeEditorState {
  const token = `{{${id}}}`;
  let result = editor;
  for (const paragraph of editor.paragraphs) {
    if (paragraph.text.includes(token))
      result = editResumeParagraph(
        result,
        paragraph.id,
        paragraph.text.replaceAll(token, value)
      );
  }
  return {
    ...result,
    slots: referencedSlots(editorText(result), result.slots),
  };
}

export function resetUnlockedParagraphs(
  editor: ResumeEditorState
): ResumeEditorState {
  const paragraphs = editor.paragraphs.map(
    (paragraph): ResumeParagraph =>
      paragraph.isLocked
        ? paragraph
        : {
            ...paragraph,
            text: paragraph.originalText,
            state: 'Original',
            revision: paragraph.revision + 1,
          }
  );
  return {
    paragraphs,
    slots: referencedSlots(
      paragraphs.map((paragraph) => paragraph.text).join('\n'),
      editor.slots
    ),
  };
}

export function isResumeEditor(value: unknown): value is ResumeEditorState {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as ResumeEditorState;
  if (!Array.isArray(candidate.paragraphs) || !Array.isArray(candidate.slots))
    return false;
  if (
    candidate.paragraphs.some((p) => !p || typeof p !== 'object') ||
    candidate.slots.some((s) => !s || typeof s !== 'object')
  )
    return false;
  return (
    new Set(candidate.paragraphs.map((paragraph) => paragraph.id)).size ===
      candidate.paragraphs.length &&
    candidate.paragraphs.every(
      (paragraph) =>
        /^p_\d+$/.test(paragraph.id) &&
        typeof paragraph.text === 'string' &&
        typeof paragraph.originalText === 'string' &&
        ['Original', 'AI_Optimized', 'User_Edited'].includes(paragraph.state) &&
        typeof paragraph.isLocked === 'boolean' &&
        Number.isInteger(paragraph.revision) &&
        paragraph.revision >= 0 &&
        (paragraph.state !== 'User_Edited' || paragraph.isLocked)
    ) &&
    candidate.slots.every(
      (slot) =>
        /^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(slot.id) &&
        typeof slot.label === 'string' &&
        typeof slot.prompt === 'string' &&
        typeof slot.fallbackText === 'string'
    )
  );
}
