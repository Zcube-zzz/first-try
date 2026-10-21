import assert from 'node:assert/strict';

import {
  buildDiagnosisPrompt,
  buildOptimizationPrompt,
} from '@/shared/services/resume/prompts';
import { RESUME_TEMPLATES } from '@/shared/services/resume/templates';

const base = {
  resumeText: '负责用户增长活动',
  targetRole: '增长产品经理',
  jdText: '需要增长实验、数据分析、转化率优化',
  templateId: 'product-manager',
  styleId: 'achievement-focused',
  locale: 'zh' as const,
};

const diagnosisPrompt = buildDiagnosisPrompt(base);
assert.equal(diagnosisPrompt.includes('JSON'), true);
assert.equal(diagnosisPrompt.includes('不要编造'), true);
assert.equal(diagnosisPrompt.includes('增长产品经理'), true);
assert.equal(diagnosisPrompt.includes('issueDetails'), true);
assert.equal(diagnosisPrompt.includes('引用原文证据'), true);
assert.equal(diagnosisPrompt.includes('投递场景'), true);
assert.equal(diagnosisPrompt.includes('意向字段不能作为'), true);
assert.equal(diagnosisPrompt.includes('年份、日期'), true);

const optimizationPrompt = buildOptimizationPrompt(base);
assert.equal(optimizationPrompt.includes('成果强化型'), true);
assert.equal(optimizationPrompt.includes('产品经理'), true);
assert.equal(optimizationPrompt.includes('需要用户确认'), true);
assert.equal(optimizationPrompt.includes('changes'), true);
assert.equal(optimizationPrompt.includes('needsConfirmation'), true);
assert.equal(optimizationPrompt.includes('confirmationItems'), true);
assert.equal(
  optimizationPrompt.includes('不得推测或新增简历未提供的数字'),
  true
);
assert.equal(optimizationPrompt.includes('不得估算或补写数字'), true);
assert.equal(
  optimizationPrompt.includes('不要把“负责 / 协助 / 参与”升级'),
  true
);
assert.match(optimizationPrompt, /一页简历草稿，而不是摘要或局部改写示例/);
assert.match(optimizationPrompt, /STAR\/CAR/);
assert.match(optimizationPrompt, /适度精简 10%～25%/);
assert.doesNotMatch(optimizationPrompt, /30%|40%|60%|70%/);
assert.match(optimizationPrompt, /参与、协助、配合、支持、跟随/);
assert.match(optimizationPrompt, /逐处原样保留该限定词及其修饰的动作/);
assert.match(optimizationPrompt, /人事、行政和销售支持/);
assert.match(optimizationPrompt, /28-40 字/);
assert.match(optimizationPrompt, /{{slot_id}}/);
assert.match(optimizationPrompt, /fallbackText/);
assert.match(
  buildOptimizationPrompt({
    ...base,
    paragraphs: [{ id: 'p_1', text: base.resumeText }],
  }),
  /不得新增、遗漏或改 id/
);
assert.match(optimizationPrompt, /具体数字由简历主人自己填写/);
assert.match(optimizationPrompt, /先由本人确认再补入简历/);
assert.match(optimizationPrompt, /不得增加实际工作量、项目数量或职责级别/);
assert.match(optimizationPrompt, /补充资料后可完善一页/);

const hardwarePrompt = buildOptimizationPrompt({
  resumeText: '协助仪器校准，使用万用表测量电气参数，参与 RS-485 通信联调。',
  targetRole: '硬件工程师',
  templateId: 'engineering',
  styleId: 'fact-preserving',
  locale: 'zh',
});
assert.match(hardwarePrompt, /根据实际方向区分软件、硬件、测试/);
assert.match(hardwarePrompt, /不因岗位名称补造设计或研发经历/);
assert.match(hardwarePrompt, /不能擅自补入 PCB 设计、EMC 测试/);
assert.match(hardwarePrompt, /未证实的工作内容放入“需要用户确认”/);

for (const scenarioId of [
  'campus',
  'product-manager',
  'engineering',
  'traditional',
  'career-change',
  'ai-product-manager',
  'consulting-functions',
]) {
  const scenario = RESUME_TEMPLATES.find((item) => item.id === scenarioId);
  assert.ok(scenario);
  assert.equal(scenario.strategy.length > 0, true);
  assert.equal(scenario.recommendedLayoutId.length > 0, true);
  assert.equal(scenario.recommendedStyleId.length > 0, true);
}

assert.match(
  buildOptimizationPrompt({
    ...base,
    rewriteScope: 'full',
    paragraphs: [{ id: 'p_1', text: base.resumeText }],
  }),
  /本次是全篇段落/
);
assert.match(
  buildOptimizationPrompt({
    ...base,
    rewriteScope: 'unlocked',
    paragraphs: [{ id: 'p_1', text: base.resumeText }],
  }),
  /不适用整份一页的字数预算/
);

assert.match(optimizationPrompt, /不能改成“保障项目顺利交付”/);
assert.match(optimizationPrompt, /严禁“共计{{count}}人次”/);
assert.match(
  buildOptimizationPrompt({
    ...base,
    paragraphs: [{ id: 'p_1', text: base.resumeText }],
  }),
  /id 是该段原文事实的地址/
);

assert.doesNotMatch(optimizationPrompt, /rewrittenResume/);
assert.match(optimizationPrompt, /超过 40 字/);
assert.match(optimizationPrompt, /严禁新增结果与程度副词/);
assert.match(optimizationPrompt, /严禁将原文已经明确提及的部门名称/);
assert.match(
  optimizationPrompt,
  /slot 仅可用于原文完全缺失的数字、频率、规模或百分比/
);
assert.equal((optimizationPrompt.match(/负责用户增长活动/g) || []).length, 1);
