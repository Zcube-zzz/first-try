import {
  ResumeDiagnosis,
  ResumeDiagnosisIssue,
  ResumeKeywordGapDetail,
  ResumeRequestContext,
  ResumeSectionScores,
} from './types';

const curatedKeywords = [
  '用户增长',
  '数据分析',
  'A/B测试',
  'SQL',
  '转化率',
  '项目管理',
  '需求分析',
  '产品经理',
  'AI',
  'Agent',
  'workflow',
  'LLM',
  'prompt',
  '产品策略',
  'ATS',
  'React',
  'Next.js',
  '增长实验',
  '跨团队',
  '商业化',
  '硬件工程师',
];

const stopWords = new Set([
  '负责',
  '需要',
  '以及',
  '和',
  '与',
  '的',
  'a',
  'an',
  'and',
  'or',
  'the',
  'for',
  'to',
  'of',
]);

function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function includesKeyword(text: string, keyword: string) {
  return text.toLocaleLowerCase().includes(keyword.toLocaleLowerCase());
}

function resumeEvidenceText(text: string) {
  return text
    .split(/\r?\n/)
    .filter(
      (line) =>
        !/^\s*(?:求职方向|目标岗位|求职意向|意向岗位|期望岗位|求职目标)\s*[:：]/i.test(
          line
        )
    )
    .join('\n');
}

function uniqueKeywords(keywords: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const keyword of keywords) {
    const normalized = keyword.trim();
    if (!normalized || stopWords.has(normalized.toLocaleLowerCase())) {
      continue;
    }

    const key = normalized.toLocaleLowerCase();
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(normalized);
  }

  return result.slice(0, 14);
}

export function extractTargetKeywords(input: ResumeRequestContext) {
  const source = `${input.targetRole ?? ''}\n${input.jdText ?? ''}`;
  const curated = curatedKeywords.filter((keyword) =>
    includesKeyword(source, keyword)
  );
  const englishTokens =
    source.match(/[A-Za-z][A-Za-z0-9+#./-]{1,}/g)?.map((token) => {
      if (token.toUpperCase() === 'SQL' || token.toUpperCase() === 'LLM') {
        return token.toUpperCase();
      }
      if (token.toLowerCase() === 'workflow') {
        return 'workflow';
      }
      if (token.toLowerCase() === 'prompt') {
        return 'prompt';
      }
      return token;
    }) ?? [];

  return uniqueKeywords([...curated, ...englishTokens]);
}

function hasQuantifiedImpact(text: string) {
  return /(?:提升|增长|提高|降低|减少|节省|缩短|增加|达到|完成|覆盖|转化率|留存率|收入|营收|GMV|DAU|MAU|ROI|用户|订单|成本|效率)[^。\n]{0,16}\d+(?:\.\d+)?\s*(?:%|％|百分点|倍|万(?:元|人|次|条|单)?|亿(?:元)?|元|人|名|次|项|条|家|个|天|小时|分钟)|\d+(?:\.\d+)?\s*(?:%|％|百分点|倍|万(?:元|人|次|条|单)?|亿(?:元)?|元|人|名|次|项|条|家|个|天|小时|分钟)[^。\n]{0,16}(?:提升|增长|提高|降低|减少|节省|缩短|增加|达到|完成|覆盖|转化率|留存率|收入|营收|GMV|DAU|MAU|ROI|用户|订单|成本|效率)/i.test(
    text
  );
}

function createSectionScores(params: {
  keywordScore: number;
  experienceScore: number;
  atsScore: number;
  readabilityScore: number;
}): ResumeSectionScores {
  return {
    keywords: clampScore(params.keywordScore),
    experience: clampScore(params.experienceScore),
    ats: clampScore(params.atsScore),
    readability: clampScore(params.readabilityScore),
  };
}

function getLevel(score: number) {
  if (score >= 80) return 'high';
  if (score >= 60) return 'medium';
  return 'low';
}

function firstExperienceLine(text: string, fallback: string) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(
      (line) =>
        line.length > 0 &&
        !/^(?:姓名|教育背景|实习经历|工作经历|项目经历|技能|求职方向|目标岗位|求职意向|意向岗位|期望岗位|求职目标)\s*[:：]?$/i.test(
          line
        ) &&
        !/^\s*(?:求职方向|目标岗位|求职意向|意向岗位|期望岗位|求职目标)\s*[:：]/i.test(
          line
        )
    );
  return (
    lines.find((line) =>
      /负责|主导|参与|协助|完成|推进|梳理|搭建|设计|优化|分析|跟进|开发|实施|策划|维护|上线|整理|协调|输出|复盘|建立/.test(
        line
      )
    ) ??
    lines.find((line) => line.length > 12) ??
    fallback
  );
}

function inferCurrentDirection(text: string) {
  const directions = [
    {
      keywords: [
        '硬件工程师',
        'PLC',
        'RS-485',
        '示波器',
        '万用表',
        '信号发生器',
        '电气连接',
        '校准',
      ],
      label: '仪器硬件调试与电气测试',
    },
    {
      keywords: ['产品运营', '运营实习', '运营专员'],
      label: '产品运营与活动执行',
    },
    {
      keywords: ['产品经理', '需求分析', '产品策略'],
      label: '产品设计与需求分析',
    },
    {
      keywords: ['用户增长', '转化率', '增长实验'],
      label: '用户增长与业务运营',
    },
    {
      keywords: ['SQL', 'React', 'Next.js', 'Python'],
      label: '技术实现与数据分析',
    },
    { keywords: ['项目管理', '跨团队'], label: '项目推进与跨部门协作' },
  ];

  const match = directions.find(({ keywords }) =>
    keywords.some((keyword) => includesKeyword(text, keyword))
  );

  return match?.label ?? '执行与项目协作';
}

function createIssueDetails(params: {
  resumeText: string;
  keywordGaps: string[];
  quantified: boolean;
  targetRole?: string;
}): ResumeDiagnosisIssue[] {
  const issues: ResumeDiagnosisIssue[] = [];
  const evidence = firstExperienceLine(
    params.resumeText,
    '当前简历未提供足够的可引用内容'
  );

  if (params.keywordGaps.length > 0) {
    issues.push({
      title: '目标岗位关键词覆盖不足',
      description: `简历中暂未发现${params.keywordGaps.slice(0, 4).join('、')}等目标岗位表达`,
      evidence: `未在简历原文中找到：${params.keywordGaps.slice(0, 4).join('、')}`,
      impact: `目标岗位${params.targetRole ? `“${params.targetRole}”` : ''}的筛选重点可能无法从简历中被快速识别`,
      suggestion: '仅在真实经历能够支撑时，补充对应业务场景、方法或成果表达',
      priority: 'must',
    });
  }

  if (!params.quantified) {
    issues.push({
      title: '项目经历缺少结果证明',
      description: '现有内容更多说明做过什么，较少说明完成后的结果或影响',
      evidence,
      impact: '招聘方难以判断工作范围、贡献程度和业务价值',
      suggestion:
        '补充真实的样本量、项目范围、效率变化、转化结果或其他可验证指标',
      priority: 'recommended',
    });
  }

  if (params.resumeText.length < 80) {
    issues.push({
      title: '可判断信息不足',
      description: '当前简历文本较短，无法充分判断经历深度和岗位匹配度',
      evidence,
      impact: '诊断结论的可信度会受到原始信息不足的限制',
      suggestion: '补充最近经历、项目背景、个人动作和实际结果',
      priority: 'optional',
    });
  }

  return issues.slice(0, 5);
}

function createKeywordGapDetails(
  keywordGaps: string[],
  jdText?: string,
  targetRole?: string
): ResumeKeywordGapDetail[] {
  const source = jdText?.trim() || targetRole?.trim() || '';

  return keywordGaps.slice(0, 8).map((keyword) => ({
    keyword,
    reason: includesKeyword(source, keyword)
      ? `${jdText ? 'JD' : '目标岗位方向'}提到“${source
          .split(/[；;。,，\n]/)
          .find((part) => includesKeyword(part, keyword))
          ?.trim()}”，说明岗位关注“${keyword}”；只有真实经历支持时才补充对应的动作或结果。`
      : `目标岗位提到“${keyword}”。只有真实经历支持时才补充对应的动作或结果。`,
    evidence: `简历原文中未发现“${keyword}”的直接表达`,
  }));
}

export function createDeterministicDiagnosis(
  input: ResumeRequestContext
): ResumeDiagnosis {
  const resumeText = input.resumeText.trim();
  const evidenceText = resumeEvidenceText(resumeText);
  const targetKeywords = extractTargetKeywords(input);
  const keywordMatches = targetKeywords.filter((keyword) =>
    includesKeyword(evidenceText, keyword)
  );
  const keywordGaps = targetKeywords.filter(
    (keyword) => !includesKeyword(evidenceText, keyword)
  );
  const coverage =
    targetKeywords.length === 0
      ? 0.45
      : keywordMatches.length / targetKeywords.length;
  const lengthScore = Math.min(resumeText.length / 280, 1);
  const quantified = hasQuantifiedImpact(evidenceText);
  const keywordScore = 35 + coverage * 60;
  const experienceScore = 42 + lengthScore * 28 + (quantified ? 20 : 0);
  const atsScore = 52 + coverage * 30 + (resumeText.includes('\n') ? 8 : 0);
  const readabilityScore = resumeText.length > 40 ? 78 : 58;
  const score = clampScore(
    40 + coverage * 38 + lengthScore * 10 + (quantified ? 10 : 0)
  );
  const strengths: string[] = [];
  const issues: string[] = [];
  const suggestions: string[] = [];

  if (keywordMatches.length > 0) {
    strengths.push(
      `已覆盖 ${keywordMatches.slice(0, 4).join('、')} 等目标关键词`
    );
  }
  if (quantified) {
    strengths.push('简历中已经出现量化结果或业务影响表达');
  }
  if (keywordGaps.length > 0) {
    issues.push(`缺少 ${keywordGaps.slice(0, 4).join('、')} 等目标关键词`);
    suggestions.push('补充与目标岗位直接相关的技能、业务场景和成果表达');
  }
  if (!quantified) {
    issues.push('经历描述偏职责罗列，缺少可验证的结果或指标');
    suggestions.push(
      '补充真实的背景、个人动作和结果；只有职责范围确实支持时才使用“主导”等表述'
    );
  }
  if (resumeText.length < 80) {
    issues.push('简历文本较短，AI 可判断的信息不足');
    suggestions.push('补充最近两段经历、项目背景、行动和结果');
  }

  const issueDetails = createIssueDetails({
    resumeText: evidenceText,
    keywordGaps,
    quantified,
    targetRole: input.targetRole,
  });
  const keywordGapDetails = createKeywordGapDetails(
    keywordGaps,
    input.jdText,
    input.targetRole
  );
  const targetNeeds =
    targetKeywords.length > 0
      ? `目标岗位更关注：${targetKeywords.slice(0, 5).join('、')}`
      : input.targetRole
        ? `目标岗位方向为：${input.targetRole}`
        : '暂未提供明确的目标岗位要求';
  const mainGap =
    keywordGaps.length > 0
      ? `现有经历与目标岗位之间的主要差距是：${keywordGaps.slice(0, 3).join('、')}尚未被明确表达`
      : quantified
        ? '关键词覆盖基本完整，但仍需要进一步确认经历中的结果和影响'
        : '已有经历方向不明确，且缺少结果证明';

  return {
    score,
    level: getLevel(score),
    summary:
      score >= 80
        ? '匹配度较高，可继续精修表达和关键词。'
        : score >= 60
          ? '具备基础匹配度，但需要强化关键词和成果表达。'
          : '当前匹配度偏低，建议补充目标岗位关键词和可验证成果。',
    fitConclusion: {
      currentDirection: `你的简历目前更偏向：${inferCurrentDirection(evidenceText)}`,
      targetNeeds,
      mainGap,
    },
    issueDetails,
    keywordGapDetails,
    keywordMatches,
    keywordGaps,
    strengths,
    issues,
    suggestions,
    sectionScores: createSectionScores({
      keywordScore,
      experienceScore,
      atsScore,
      readabilityScore,
    }),
  };
}
