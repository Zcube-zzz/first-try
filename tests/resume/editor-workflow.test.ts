import assert from 'node:assert/strict';

import { resumeAnalyticsProperties } from '@/shared/services/resume/analytics';
import { RESUME_TEST_DEMO } from '@/shared/services/resume/demo';
import {
  formatResumeSlotLabels,
  normalizeResumeSlots,
} from '@/shared/services/resume/draft';
import {
  createResumeEditor,
  editorText,
  editResumeParagraph,
  isResumeEditor,
  mergeResumeRewrites,
  resetUnlockedParagraphs,
  resolveResumeSlot,
} from '@/shared/services/resume/editor';
import { requestResumeDocx } from '@/shared/services/resume/export-client';
import { inspectResumeText } from '@/shared/services/resume/quality';
import { getResumeTemplate } from '@/shared/services/resume/templates';

async function main() {
  assert.equal(inspectResumeText('中'.repeat(49)).isLowQuality, true);
  assert.equal(inspectResumeText('中'.repeat(50)).isLowQuality, false);
  assert.equal(
    inspectResumeText('中'.repeat(85) + '�'.repeat(15)).isLowQuality,
    false
  );
  assert.equal(
    inspectResumeText('中'.repeat(84) + '�'.repeat(16)).isLowQuality,
    true
  );
  assert.equal(
    inspectResumeText(
      '硬件测试 RS-485 3.3V ±5% 25℃ 10Ω email@example.test '.repeat(3)
    ).isLowQuality,
    false
  );
  assert.equal(inspectResumeText('').isLowQuality, true);
  assert.equal(RESUME_TEST_DEMO.targetRole, 'AI 产品经理');
  assert.equal(RESUME_TEST_DEMO.jdText.split('\n').length, 3);
  assert.equal(
    getResumeTemplate(RESUME_TEST_DEMO.templateId).title,
    '互联网社招'
  );
  assert.equal(getResumeTemplate('unknown').id, 'experienced');

  const original = createResumeEditor('协助测试\n记录问题');
  assert.ok(
    original.paragraphs.every((p) => p.state === 'Original' && !p.isLocked)
  );
  const rewritten = mergeResumeRewrites(
    original,
    original.paragraphs,
    [
      { id: 'p_1', text: '协助执行测试' },
      { id: 'p_2', text: '整理问题记录' },
    ],
    []
  );
  assert.ok(
    rewritten.paragraphs.every((p) => p.state === 'AI_Optimized' && !p.isLocked)
  );
  const edited = editResumeParagraph(rewritten, 'p_1', '我本人确认的内容');
  const unlocked = edited.paragraphs.filter((p) => !p.isLocked);
  assert.deepEqual(
    unlocked.map((p) => p.id),
    ['p_2']
  );
  const merged = mergeResumeRewrites(
    edited,
    unlocked,
    [
      { id: 'p_1', text: '不可覆盖' },
      { id: 'p_2', text: '第二次 AI 内容' },
    ],
    []
  );
  assert.equal(merged.paragraphs[0].text, '我本人确认的内容');
  assert.equal(merged.paragraphs[1].text, '第二次 AI 内容');
  const inFlightEdit = editResumeParagraph(
    edited,
    'p_2',
    '等待 AI 时新增的手改'
  );
  assert.equal(
    mergeResumeRewrites(
      inFlightEdit,
      unlocked,
      [{ id: 'p_2', text: '迟到结果' }],
      []
    ).paragraphs[1].text,
    '等待 AI 时新增的手改'
  );
  const localSnapshot = [edited.paragraphs[0]];
  assert.equal(
    mergeResumeRewrites(
      edited,
      localSnapshot,
      [{ id: 'p_1', text: '确认覆盖' }],
      []
    ).paragraphs[0].isLocked,
    true
  );
  const confirmed = mergeResumeRewrites(
    edited,
    localSnapshot,
    [{ id: 'p_1', text: '确认覆盖' }],
    [],
    true
  );
  assert.equal(confirmed.paragraphs[0].text, '确认覆盖');
  assert.equal(confirmed.paragraphs[0].isLocked, false);
  const duringLocal = editResumeParagraph(edited, 'p_1', '确认后又修改');
  assert.equal(
    mergeResumeRewrites(
      duringLocal,
      localSnapshot,
      [{ id: 'p_1', text: '迟到覆盖' }],
      [],
      true
    ).paragraphs[0].text,
    '确认后又修改'
  );
  assert.equal(
    resetUnlockedParagraphs(edited).paragraphs[0].text,
    '我本人确认的内容'
  );
  assert.equal(resetUnlockedParagraphs(edited).paragraphs[1].text, '记录问题');
  assert.equal(isResumeEditor(JSON.parse(JSON.stringify(edited))), true);
  assert.equal(
    isResumeEditor({
      ...edited,
      paragraphs: [{ ...edited.paragraphs[0], isLocked: false }],
    }),
    false
  );

  const slots = normalizeResumeSlots(
    ['对{{count}}进行校准', '复核{{count}}；{{growth}}'],
    [
      {
        id: 'count',
        label: '设备数量',
        prompt: '填写数量与单位',
        fallbackText: '相关设备',
      },
      {
        id: 'growth',
        label: '增长',
        prompt: '填写真实依据',
        fallbackText: '大幅提升',
      },
    ],
    '对设备进行校准',
    'slot_test'
  );
  assert.equal(slots.slots.length, 2);
  assert.equal(slots.texts[0], '对{{slot_test_1}}进行校准');
  assert.equal(slots.texts[1], '复核{{slot_test_1}}；{{slot_test_2}}');
  assert.equal(slots.slots[1].fallbackText, '');
  const withSlots = mergeResumeRewrites(
    original,
    original.paragraphs,
    slots.texts.map((text, index) => ({ id: `p_${index + 1}`, text })),
    slots.slots
  );
  const resolved = resolveResumeSlot(
    withSlots,
    'slot_test_1',
    '本人核实的 20 台设备'
  );
  assert.equal(editorText(resolved).match(/本人核实的 20 台设备/g)?.length, 2);
  assert.ok(resolved.paragraphs.every((p) => p.isLocked));
  assert.equal(resolved.slots.length, 1);
  const finished = resolveResumeSlot(resolved, 'slot_test_2', '');
  assert.equal(finished.slots.length, 0);
  assert.doesNotMatch(editorText(finished), /{{/);
  assert.deepEqual(
    resumeAnalyticsProperties({
      resumeText: '私密简历',
      jdText: '私密 JD',
      value: '20台',
      slot_id: 'slot_test_1',
      action: 'filled',
      paragraph_id: 'p_1',
      duration_ms: 42,
    }),
    {
      slot_id: 'slot_test_1',
      action: 'filled',
      paragraph_id: 'p_1',
      duration_ms: 42,
    }
  );
  assert.deepEqual(
    resumeAnalyticsProperties({
      slot_id: '张三',
      paragraph_id: '名字',
      duration_ms: NaN,
      slot_count: -1,
    }),
    {}
  );

  const legacyNumeric = normalizeResumeSlots(
    [
      '访谈业务同事共计{{count}}人次，归纳查询问题。',
      '汇总问题并参与{{rounds}}轮迭代复盘。',
    ],
    [
      { id: 'count', label: '人次', fallbackText: '多位' },
      { id: 'rounds', label: '轮次', fallbackText: '多轮' },
    ],
    '访谈业务同事，归纳查询问题；汇总问题并参与迭代复盘。',
    'slot_numeric'
  );
  assert.deepEqual(
    legacyNumeric.texts.map((text) =>
      legacyNumeric.slots.reduce(
        (result, slot) =>
          result.replaceAll(`{{${slot.id}}}`, slot.fallbackText),
        text
      )
    ),
    ['访谈业务同事，归纳查询问题。', '汇总问题并参与迭代复盘。']
  );
  const labels = [
    {
      id: 'slot_server_1',
      sourceId: 'interview_count',
      label: '访谈人数',
      prompt: '填写真实人数',
      fallbackText: '',
    },
  ];
  assert.equal(
    formatResumeSlotLabels(
      '访谈{{interview_count}}；复核{{slot_server_1}}。',
      labels
    ),
    '访谈【待补充：访谈人数】；复核【待补充：访谈人数】。'
  );
  assert.equal(
    formatResumeSlotLabels('{{unknown}}', labels),
    '【待补充：待确认信息】'
  );
  assert.equal(formatResumeSlotLabels('正常文本', labels), '正常文本');
  const previousFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () =>
      ({
        ok: true,
        headers: new Headers({
          'Content-Type':
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        }),
        blob: async () => {
          await new Promise((r) => setTimeout(r, 25));
          return new Blob(['docx']);
        },
      }) as Response;
    const file = await requestResumeDocx({
      title: '测试',
      rewrittenResume: '虚构内容',
    });
    assert.ok(
      file.durationMs >= 20,
      'Duration includes complete response body'
    );
    assert.equal(file.blob.size, 4);
    globalThis.fetch = async (_url, options) =>
      new Promise((_resolve, reject) => {
        options?.signal?.addEventListener('abort', () =>
          reject(new DOMException('timeout', 'AbortError'))
        );
      });
    await assert.rejects(
      requestResumeDocx(
        { title: '测试', rewrittenResume: '虚构' },
        { timeoutMs: 5 }
      ),
      { name: 'AbortError' }
    );
    globalThis.fetch = async () => new Response('failed', { status: 400 });
    await assert.rejects(
      requestResumeDocx({ title: '测试', rewrittenResume: '虚构' }),
      /Export failed/
    );
    globalThis.fetch = async () =>
      new Response('not a docx', { headers: { 'Content-Type': 'text/plain' } });
    await assert.rejects(
      requestResumeDocx({ title: '测试', rewrittenResume: '虚构' }),
      /Export failed/
    );
  } finally {
    globalThis.fetch = previousFetch;
  }
  console.log(
    'Editor, slots, quality, analytics and export client checks passed'
  );
}
main();
