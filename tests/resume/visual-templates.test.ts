import assert from 'node:assert/strict';

import {
  getResumeLayoutTemplate,
  getResumeVisualTheme,
  RESUME_LAYOUT_TEMPLATES,
  RESUME_VISUAL_THEMES,
} from '@/shared/services/resume/visual-templates';

assert.equal(RESUME_LAYOUT_TEMPLATES.length, 3);
assert.deepEqual(
  RESUME_LAYOUT_TEMPLATES.map((template) => template.id),
  [
    'ats-clean',
    'business-professional',
    'product-results',
  ]
);

for (const template of RESUME_LAYOUT_TEMPLATES) {
  assert.equal(template.title.length > 0, true);
  assert.equal(template.description.length > 0, true);
  assert.equal(template.previewSections.length >= 3, true);
  assert.equal(template.sampleBlocks.length >= 4, true);
  assert.equal(
    template.sampleBlocks.some((block) =>
      block.lines.some((line) => /XXXX|20XX/.test(line))
    ),
    true
  );
  assert.equal(template.structure, 'single-column');
}

assert.equal(RESUME_VISUAL_THEMES.length, 3);
assert.deepEqual(
  RESUME_VISUAL_THEMES.map((theme) => theme.id),
  ['clean-white', 'business-blue', 'intelligent-gray']
);

for (const theme of RESUME_VISUAL_THEMES) {
  assert.match(theme.accentColor, /^#[0-9a-f]{6}$/i);
  assert.match(theme.background, /^#[0-9a-f]{6}$/i);
  assert.equal(theme.swatches.length >= 3, true);
}

assert.equal(getResumeLayoutTemplate('product-results').id, 'product-results');
assert.equal(getResumeLayoutTemplate('missing').id, 'ats-clean');
assert.equal(getResumeVisualTheme('business-blue').id, 'business-blue');
assert.equal(getResumeVisualTheme('missing').id, 'clean-white');
