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
assert.equal(strong.fitConclusion.targetNeeds.includes('用户增长'), true);
assert.equal(strong.keywordGapDetails.length, strong.keywordGaps.length);

const weak = createDeterministicDiagnosis({
  resumeText: '负责日常工作 协助团队 完成任务',
  targetRole: 'AI 产品经理',
  jdText: 'Agent workflow LLM prompt 数据分析 产品策略',
  locale: 'zh',
});

assert.equal(weak.score < 70, true);
assert.equal(weak.keywordGaps.includes('Agent'), true);
assert.equal(weak.issues.length > 0, true);
assert.equal(weak.issueDetails.length > 0, true);
assert.equal(
  weak.issueDetails.every((item) => item.evidence.length > 0),
  true
);

const simulatedCandidate = createDeterministicDiagnosis({
  resumeText: [
    '候选人甲',
    '求职方向：增长产品经理',
    '教育背景：虚构大学，信息管理专业，2024届',
    '实习经历：某虚构电商平台｜产品运营实习生',
    '负责整理每周用户反馈，协助梳理小程序活动需求，与设计和研发同学沟通排期。',
    '技能：Excel、基础SQL。',
  ].join('\n'),
  targetRole: '增长产品经理',
  jdText: '负责用户增长策略、需求分析；关注新用户转化率、留存率',
  locale: 'zh',
});

assert.equal(simulatedCandidate.keywordMatches.includes('产品经理'), false);
assert.equal(
  simulatedCandidate.strengths.some((item) => item.includes('量化结果')),
  false
);
assert.equal(
  simulatedCandidate.fitConclusion.currentDirection.includes('产品运营'),
  true
);
assert.equal(
  simulatedCandidate.issueDetails
    .find((item) => item.title.includes('结果证明'))
    ?.evidence.includes('负责整理每周用户反馈'),
  true
);
assert.equal(
  simulatedCandidate.keywordGapDetails
    .find((item) => item.keyword === '转化率')
    ?.reason.includes('关注新用户转化率'),
  true
);

const quantified = createDeterministicDiagnosis({
  resumeText: '负责活动优化，活动转化率提升 18%。',
  targetRole: '运营',
  jdText: '转化率',
});
assert.equal(
  quantified.strengths.some((item) => item.includes('量化结果')),
  true
);

const hardwareCandidate = createDeterministicDiagnosis({
  resumeText:
    '负责仪器电气连接和参数校准，使用万用表、示波器、信号发生器调试 PLC 与 RS-485 通信。',
  targetRole: '硬件工程师',
  locale: 'zh',
});
assert.equal(
  hardwareCandidate.fitConclusion.currentDirection.includes('硬件调试'),
  true
);
assert.equal(hardwareCandidate.keywordGaps.includes('硬件工程师'), true);
assert.equal(
  hardwareCandidate.keywordGapDetails[0].evidence.includes('硬件工程师'),
  true
);
