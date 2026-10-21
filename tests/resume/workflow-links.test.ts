import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function readJson(relativePath: string) {
  return JSON.parse(readFileSync(path.join(root, relativePath), 'utf8'));
}

for (const locale of ['zh', 'en']) {
  const index = readJson(
    `src/config/locale/messages/${locale}/pages/index.json`
  );
  const landing = readJson(`src/config/locale/messages/${locale}/landing.json`);

  const featureSection = index.page.sections.features;
  assert.equal(featureSection.block, 'resume-feature-showcase');
  assert.equal(featureSection.items.length >= 3, true);
  const indexText = JSON.stringify(index);
  assert.equal(indexText.includes('PDF / DOCX / image'), false);
  assert.equal(indexText.includes('PDF / DOCX / 图片'), false);
  assert.equal(indexText.includes('image, or paste'), false);
  assert.equal(indexText.includes('图片，或直接粘贴'), false);
  for (const item of featureSection.items) {
    assert.match(item.url, /^\/resume(\/diagnose|\/optimize)?$/);
  }

  const headerUrls = landing.header.nav.items.map(
    (item: { url?: string }) => item.url
  );
  assert.equal(headerUrls.includes('/resume'), true);
}

for (const relativePath of [
  'src/app/[locale]/(landing)/resume/page.tsx',
  'src/app/[locale]/(landing)/resume/diagnose/page.tsx',
  'src/app/[locale]/(landing)/resume/optimize/page.tsx',
]) {
  assert.equal(existsSync(path.join(root, relativePath)), true);
}

const workflowSource = readFileSync(
  path.join(root, 'src/shared/blocks/resume/resume-workflow-page.tsx'),
  'utf8'
);

assert.equal(workflowSource.includes('.png'), false);
assert.equal(workflowSource.includes('.jpg'), false);
assert.equal(workflowSource.includes('.jpeg'), false);
assert.equal(workflowSource.includes('PDF / DOCX / image / text'), false);
assert.equal(workflowSource.includes('PDF / DOCX / 图片 / 文本'), false);

for (const diagnosisLabel of [
  'sectionScoreTitle',
  'strengthsTitle',
  'issuesTitle',
  'suggestionsTitle',
]) {
  assert.equal(workflowSource.includes(diagnosisLabel), true);
}
