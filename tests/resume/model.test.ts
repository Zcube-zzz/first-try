import assert from 'node:assert/strict';

import { getResumeFillInFields } from '@/shared/services/resume/draft';
import {
  runResumeDiagnosis,
  runResumeOptimization,
} from '@/shared/services/resume/model';

async function main() {
  assert.deepEqual(
    getResumeFillInFields(
      '2024 年校准【待填写：设备台数】台；复核【待填写：设备台数】台，耗时【待填写:统计周期】'
    ),
    ['设备台数', '统计周期']
  );
  assert.deepEqual(getResumeFillInFields('已校准 20 台设备，良率 98%'), []);
  const previousFetch = globalThis.fetch;
  const previousEnv = {
    EVOLINK_API_KEY: process.env.EVOLINK_API_KEY,
    EVOLINK_BASE_URL: process.env.EVOLINK_BASE_URL,
    EVOLINK_FREE_MODEL: process.env.EVOLINK_FREE_MODEL,
  };

  try {
    let requestedUrl = '';
    globalThis.fetch = async (url) => {
      requestedUrl = String(url);
      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content:
                  '{"score":84,"level":"high","summary":"匹配较好","keywordMatches":["SQL"],"keywordGaps":[],"strengths":["数据能力"],"issues":[],"suggestions":[],"sectionScores":{"keywords":90,"experience":80,"ats":82,"readability":84}}',
              },
            },
          ],
        })
      );
    };

    process.env.EVOLINK_API_KEY = 'test-key';
    process.env.EVOLINK_BASE_URL = 'https://example.test/v1';
    process.env.EVOLINK_FREE_MODEL = 'test-model';

    const diagnosis = await runResumeDiagnosis({
      resumeText: 'SQL 数据分析 产品经理',
      targetRole: '产品经理',
      jdText: 'SQL 数据分析',
      locale: 'zh',
    });

    assert.equal(requestedUrl, 'https://example.test/v1/chat/completions');
    process.env.EVOLINK_BASE_URL = 'https://example.test';
    await runResumeDiagnosis({
      resumeText: '协助测试',
      targetRole: '测试工程师',
    });
    assert.equal(requestedUrl, 'https://example.test/v1/chat/completions');
    process.env.EVOLINK_BASE_URL = 'https://example.test/custom/v2/';
    await runResumeDiagnosis({
      resumeText: '协助测试',
      targetRole: '测试工程师',
    });
    assert.equal(
      requestedUrl,
      'https://example.test/custom/v2/chat/completions'
    );
    process.env.EVOLINK_BASE_URL = 'https://example.test/v1';
    assert.equal(diagnosis.score, 84);
    assert.equal(diagnosis.keywordMatches.includes('SQL'), true);
    assert.equal(diagnosis.fitConclusion.currentDirection.length > 0, true);
    assert.equal(diagnosis.issueDetails.length > 0, true);

    const draft =
      '虚构候选人\n求职方向：硬件工程师\n工作经历\n协助校准【待填写：设备台数】台仪器，使用万用表测量电气参数';
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  title: '虚构候选人 硬件工程师',
                  summary:
                    '保留真实职责并预留工作量字段；补充资料后可完善一页。',
                  rewrittenResume: '这个旧字段不得作为正文',
                  paragraphs: draft
                    .split('\n')
                    .map((text, index) => ({ id: `p_${index + 1}`, text })),
                  slots: [],
                  changes: [],
                  confirmationItems: [
                    {
                      category: 'scope',
                      item: '是否做过 PCB 设计？若属实请补充工具、职责和真实交付；未做过则忽略。',
                      reason: '原文未出现，仅作待本人确认的经历补充建议。',
                    },
                  ],
                  factsToConfirm: [],
                  changeNotes: [],
                }),
              },
            },
          ],
        })
      );
    const successfulDraft = await runResumeOptimization({
      resumeText:
        '虚构候选人\n求职方向：硬件工程师\n工作经历\n协助仪器校准，使用万用表测量电气参数。',
      targetRole: '硬件工程师',
      templateId: 'engineering',
    });
    assert.equal(successfulDraft.generationStatus, 'success');
    assert.equal(successfulDraft.slots.length, 1);
    assert.match(successfulDraft.slots[0].id, /^slot_[a-f0-9]+_1$/);
    assert.equal(successfulDraft.slots[0].fallbackText, '相关设备');
    assert.equal(
      successfulDraft.rewrittenResume,
      draft.replace(
        '【待填写：设备台数】台仪器',
        `{{${successfulDraft.slots[0].id}}}`
      )
    );
    assert.equal(successfulDraft.rewrittenResume.includes('PCB'), false);
    assert.equal(successfulDraft.rewrittenResume.includes('主导'), false);
    assert.equal(
      successfulDraft.confirmationItems.filter(
        (item) => item.category === 'metric'
      ).length,
      1
    );
    assert.ok(
      successfulDraft.confirmationItems.some((item) =>
        item.item.includes('设备台数')
      )
    );
    assert.ok(
      successfulDraft.factsToConfirm.some((item) => item.includes('设备台数'))
    );

    const paragraphInput = {
      resumeText: '协助测试',
      paragraphs: [{ id: 'p_1', text: '协助测试' }],
      targetRole: '硬件工程师',
    };
    for (const paragraphs of [
      [],
      [{ id: 'p_2', text: '另一段' }],
      [{ id: 'p_1', text: '' }],
    ]) {
      globalThis.fetch = async () =>
        new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    title: '测试标题',
                    summary: '测试',
                    paragraphs,
                    slots: [],
                    changes: [],
                    confirmationItems: [],
                    changeNotes: [],
                  }),
                },
              },
            ],
          })
        );
      const invalid = await runResumeOptimization(paragraphInput);
      assert.equal(invalid.generationStatus, 'fallback');
      assert.equal(invalid.rewrittenResume, '协助测试');
    }
    let lastRequest: any;
    globalThis.fetch = async (_url, options) => {
      lastRequest = JSON.parse(String(options?.body));
      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  title: '模型篡改的标题',
                  summary: '仅此段',
                  paragraphs: [{ id: 'p_1', text: '参与测试' }],
                  slots: [],
                  changes: [],
                  confirmationItems: [],
                  changeNotes: [],
                }),
              },
            },
          ],
        })
      );
    };
    for (const rewriteScope of ['paragraph', 'unlocked'] as const) {
      const result = await runResumeOptimization({
        ...paragraphInput,
        rewriteScope,
        draftTitle: '原草稿标题',
      });
      assert.equal(result.generationStatus, 'success');
      assert.equal(result.title, '原草稿标题');
      assert.equal(result.rewrittenResume, '协助测试');
      assert.match(result.changeNotes.join(''), /职责边界保护/);
      const schema = lastRequest.response_format.json_schema.schema;
      assert.equal(lastRequest.response_format.type, 'json_schema');
      assert.equal(lastRequest.response_format.json_schema.strict, true);
      assert.ok(schema.required.includes('paragraphs'));
      assert.equal('rewrittenResume' in schema.properties, false);
      assert.equal('diagnosis' in schema.properties, false);
      assert.equal('title' in schema.properties, false);
      assert.equal(schema.properties.slots.maxItems, undefined);
      assert.equal(
        schema.properties.slots.items.properties.id.pattern,
        undefined
      );
    }
    await assert.rejects(
      runResumeOptimization({ ...paragraphInput, rewriteScope: 'paragraph' }),
      /Original draft title/
    );
    // Qualifiers elsewhere in a paragraph or in a slot cannot mask a lost boundary.
    for (const [original, revised, preserved] of [
      [
        '参与访谈人事、行政和销售支持同事，协助维护文档。',
        '访谈人事、行政和销售支持同事，协助维护文档。',
        true,
      ],
      ['协助测试，协助复核。', '协助测试，复核。', true],
      ['配合检查权限。', '检查权限{{配合}}。', true],
      ['支持资料整理。', '主导资料整理。', true],
      ['跟随同事访谈。', '访谈同事。', true],
      ['参与测试。', '参与测试并主导验收。', true],
      ['参与测试，独立负责记录。', '参与测试；独立负责记录。', false],
      ['参与测试并记录问题。', '参与测试，记录问题。', false],
    ] as const) {
      globalThis.fetch = async () =>
        new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    title: '测试',
                    summary: '测试',
                    paragraphs: [{ id: 'p_1', text: revised }],
                    slots: [],
                    changes: [
                      {
                        original,
                        revised,
                        type: 'expression',
                        reason: '精简',
                        needsConfirmation: false,
                      },
                    ],
                    confirmationItems: [],
                    changeNotes: [],
                  }),
                },
              },
            ],
          })
        );
      const result = await runResumeOptimization({
        ...paragraphInput,
        resumeText: original,
        paragraphs: [{ id: 'p_1', text: original }],
      });
      assert.equal(result.rewrittenResume, preserved ? original : revised);
      assert.equal(result.changes.length, preserved ? 0 : 1);
      assert.equal(
        result.changeNotes.some((note) => note.includes('职责边界保护')),
        preserved
      );
    }
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  title: '旧协议',
                  summary: '测试',
                  rewrittenResume: '只有旧字段',
                  slots: [],
                  changes: [],
                  confirmationItems: [],
                  changeNotes: [],
                }),
              },
            },
          ],
        })
      );
    assert.equal(
      (await runResumeOptimization(paragraphInput)).generationStatus,
      'fallback'
    );
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  title: '重复段落',
                  summary: '测试',
                  paragraphs: [
                    { id: 'p_1', text: '第一段' },
                    { id: 'p_1', text: '重复第一段' },
                  ],
                  slots: [],
                  changes: [],
                  confirmationItems: [],
                  changeNotes: [],
                }),
              },
            },
          ],
        })
      );
    const duplicate = await runResumeOptimization({
      ...paragraphInput,
      resumeText: '协助测试\n记录问题',
      paragraphs: [
        ...paragraphInput.paragraphs,
        { id: 'p_2', text: '记录问题' },
      ],
    });
    assert.equal(duplicate.generationStatus, 'fallback');
    assert.equal(duplicate.rewrittenResume, '协助测试\n记录问题');
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 });

    const fallbackDiagnosis = await runResumeDiagnosis({
      resumeText: '产品经理 用户增长 SQL',
      targetRole: '增长产品经理',
      jdText: '用户增长 SQL A/B测试 转化率',
      locale: 'zh',
    });

    assert.equal(fallbackDiagnosis.score > 0, true);
    assert.equal(fallbackDiagnosis.keywordMatches.includes('SQL'), true);

    const fallbackOptimization = await runResumeOptimization({
      resumeText: '负责用户增长 SQL',
      targetRole: '增长产品经理',
      jdText: '用户增长 SQL A/B测试 转化率',
      templateId: 'product-manager',
      styleId: 'achievement-focused',
      locale: 'zh',
    });

    assert.equal(fallbackOptimization.rewrittenResume, '负责用户增长 SQL');
    assert.equal(fallbackOptimization.changes.length, 0);
    assert.equal(fallbackOptimization.summary.includes('已保留原文'), true);
    assert.equal(fallbackOptimization.summary.includes('可以重试'), true);
    assert.equal(fallbackOptimization.summary.includes('资料不足'), false);
    assert.equal(fallbackOptimization.confirmationItems.length > 0, true);
    assert.equal(fallbackOptimization.confirmationItems[0].category, 'scope');
    assert.equal(fallbackOptimization.diagnosis.score > 0, true);
  } finally {
    globalThis.fetch = previousFetch;
    process.env.EVOLINK_API_KEY = previousEnv.EVOLINK_API_KEY;
    process.env.EVOLINK_BASE_URL = previousEnv.EVOLINK_BASE_URL;
    process.env.EVOLINK_FREE_MODEL = previousEnv.EVOLINK_FREE_MODEL;
  }
}

main();
