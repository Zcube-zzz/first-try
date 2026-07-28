import assert from 'node:assert/strict';

import {
  buildDiagnosisPrompt,
  buildOptimizationPrompt,
} from '@/shared/services/resume/prompts';

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

const optimizationPrompt = buildOptimizationPrompt(base);
assert.equal(optimizationPrompt.includes('成果强化型'), true);
assert.equal(optimizationPrompt.includes('产品经理'), true);
assert.equal(optimizationPrompt.includes('需要用户确认'), true);
