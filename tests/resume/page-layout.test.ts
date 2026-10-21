import assert from 'node:assert/strict';
import { POST } from '@/app/api/resume/export/route';

import {
  getResumeHeadingColor,
  getResumePageLayout,
  getResumePageProfile,
  selectResumeDensity,
} from '@/shared/services/resume/page-layout';

async function main() {
  for (const [value, expected] of [
    [0, 'relaxed'],
    [25, 'relaxed'],
    [25.5, 'standard'],
    [55, 'standard'],
    [55.5, 'compact'],
    [88, 'compact'],
    [88.5, 'two-page'],
  ] as const) {
    assert.equal(selectResumeDensity(value, 'experienced'), expected);
    assert.equal(selectResumeDensity(value, 'unknown'), expected);
  }
  assert.equal(selectResumeDensity(88.5, 'campus'), 'compact');
  assert.equal(selectResumeDensity(95, 'campus'), 'compact');
  assert.equal(selectResumeDensity(95.5, 'campus'), 'two-page');
  for (let count = 0; count <= 100; count += 0.5) {
    const profile = getResumePageProfile(count, 'campus');
    assert.ok(profile.titlePt >= 18 && profile.titlePt <= 20);
    assert.ok(profile.titleAfterPt >= 8 && profile.titleAfterPt <= 12);
    assert.ok(profile.fontPt >= 9.5 && profile.fontPt <= 11);
    assert.ok(profile.lineHeightPt >= profile.fontPt * 1.3);
    assert.ok(profile.lineHeightPt >= (profile.fontPt === 10 ? 13.5 : 12.5));
    assert.ok(
      profile.sectionPt - profile.fontPt >= 2.5 &&
        profile.sectionPt - profile.fontPt <= 3
    );
    assert.ok(profile.sectionBeforePt >= 9 && profile.sectionAfterPt >= 4);
    assert.ok(
      profile.subheadingPt - profile.fontPt >= 0.5 &&
        profile.subheadingPt - profile.fontPt <= 1
    );
    assert.equal(profile.subheadingBeforePt, 5.5);
    assert.equal(profile.subheadingAfterPt, 2);
  }
  const roomy = getResumePageProfile(67);
  const dense = getResumePageProfile(83);
  assert.equal(roomy.fontPt, 10);
  assert.equal(roomy.lineHeightPt, 14);
  assert.equal(roomy.paragraphAfterPt, 3.5);
  assert.equal(roomy.marginTopMm, 15);
  assert.equal(dense.fontPt, 9.5);
  assert.equal(dense.lineHeightPt, 12.65);
  assert.equal(dense.paragraphAfterPt, 2.25);
  assert.equal(dense.marginTopMm, 12.5);
  const midway = getResumePageProfile(75);
  assert.ok(
    midway.lineHeightPt < roomy.lineHeightPt &&
      midway.lineHeightPt > dense.lineHeightPt
  );
  assert.ok(
    midway.paragraphAfterPt < roomy.paragraphAfterPt &&
      midway.paragraphAfterPt > dense.paragraphAfterPt
  );
  assert.ok(
    midway.marginTopMm < roomy.marginTopMm &&
      midway.marginTopMm > dense.marginTopMm
  );
  assert.equal(getResumeHeadingColor('#2563eb'), '#17365D');
  assert.equal(getResumeHeadingColor('#111827'), '#111827');
  const text = '  虚构候选人  \n\n## 【工作经历】：\n' + '中'.repeat(40);
  const measured = getResumePageLayout(text);
  assert.equal(measured.estimatedLines, 8);
  assert.deepEqual(
    measured.lines.map((line) => line.kind),
    ['name', 'section', 'body']
  );
  assert.deepEqual(
    measured.lines.map((line) => line.text),
    text.split('\n').filter(Boolean)
  );
  assert.equal(getResumePageLayout(text + '中').estimatedLines, 9);
  assert.equal(getResumePageLayout('😀'.repeat(40)).estimatedLines, 3.5);
  assert.equal(getResumePageLayout('\n \n').lines.length, 0);
  const hierarchy = getResumePageLayout(
    '虚构候选人\n工作经历\n虚构公司｜产品助理\n参与需求记录，不负责产品决策。\n项目经历\n知识问答助手项目\n记录问题并参与复盘。\n教育背景\n虚构大学｜信息管理｜本科。未提供日期。'
  );
  assert.deepEqual(
    hierarchy.lines.map((line) => line.kind),
    [
      'name',
      'section',
      'subheading',
      'body',
      'section',
      'subheading',
      'body',
      'section',
      'subheading',
    ]
  );
  assert.ok(Number.isFinite(hierarchy.estimatedEndPt));
  assert.ok(Number.isFinite(hierarchy.remainingHeightPt));

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new Error('Layout/export must not call any external API');
  };
  try {
    const response = await POST(
      new Request('http://localhost/api/resume/export', {
        method: 'POST',
        body: JSON.stringify({
          title: '虚构排版测试',
          rewrittenResume: text,
          templateId: 'campus',
        }),
      })
    );
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('X-Resume-Density'), 'relaxed');
    assert.equal(response.headers.get('X-Resume-Estimated-Lines'), '8');
    assert.ok((await response.arrayBuffer()).byteLength > 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
}
main();
