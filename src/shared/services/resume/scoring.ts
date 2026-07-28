import {
  ResumeDiagnosis,
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
  return /(\d+[%+]?|提升|增长|降低|节省|转化率|GMV|DAU|MAU|ROI)/i.test(text);
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

export function createDeterministicDiagnosis(
  input: ResumeRequestContext
): ResumeDiagnosis {
  const resumeText = input.resumeText.trim();
  const targetKeywords = extractTargetKeywords(input);
  const keywordMatches = targetKeywords.filter((keyword) =>
    includesKeyword(resumeText, keyword)
  );
  const keywordGaps = targetKeywords.filter(
    (keyword) => !includesKeyword(resumeText, keyword)
  );
  const coverage =
    targetKeywords.length === 0
      ? 0.45
      : keywordMatches.length / targetKeywords.length;
  const lengthScore = Math.min(resumeText.length / 280, 1);
  const quantified = hasQuantifiedImpact(resumeText);
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
    strengths.push(`已覆盖 ${keywordMatches.slice(0, 4).join('、')} 等目标关键词`);
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
    suggestions.push('把“负责/参与”改写为“主导/推动 + 动作 + 结果”');
  }
  if (resumeText.length < 80) {
    issues.push('简历文本较短，AI 可判断的信息不足');
    suggestions.push('补充最近两段经历、项目背景、行动和结果');
  }

  return {
    score,
    level: getLevel(score),
    summary:
      score >= 80
        ? '匹配度较高，可继续精修表达和关键词。'
        : score >= 60
          ? '具备基础匹配度，但需要强化关键词和成果表达。'
          : '当前匹配度偏低，建议补充目标岗位关键词和可验证成果。',
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
