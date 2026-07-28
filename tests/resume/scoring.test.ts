import assert from 'node:assert/strict';

import { createDeterministicDiagnosis } from '@/shared/services/resume/scoring';

const strong = createDeterministicDiagnosis({
  resumeText: '产品经理 用户增长 数据分析 A/B测试 SQL 转化率 项目管理 需求分析',
  targetRole: '用户增长产品经理',
  jdText: '负责用户增长、A/B测试、数据分析、SQL、转化率提升和跨团队项目管理',
  locale: 'zh',
});

assert.equal(strong.score >= 70, true);
assert.equal(strong.keywordMatches.includes('用户增长'), true);
assert.equal(strong.keywordMatches.includes('SQL'), true);
assert.equal(strong.keywordGaps.length <= 3, true);

const weak = createDeterministicDiagnosis({
  resumeText: '负责日常工作 协助团队 完成任务',
  targetRole: 'AI 产品经理',
  jdText: 'Agent workflow LLM prompt 数据分析 产品策略',
  locale: 'zh',
});

assert.equal(weak.score < 70, true);
assert.equal(weak.keywordGaps.includes('Agent'), true);
assert.equal(weak.issues.length > 0, true);
