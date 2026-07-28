import { createDeterministicDiagnosis } from './scoring';
import { getResumeRewriteStyle, getResumeTemplate } from './templates';
import { ResumeRequestContext } from './types';

function localeInstruction(locale?: string) {
  return locale === 'en'
    ? 'Return all user-facing content in concise professional English.'
    : '请使用自然、专业的中文输出。';
}

function sharedContext(input: ResumeRequestContext) {
  const template = getResumeTemplate(input.templateId);
  const style = getResumeRewriteStyle(input.styleId);

  return {
    template,
    style,
    text: [
      `目标岗位 / 方向：${input.targetRole || '用户未填写'}`,
      `目标 JD：${input.jdText || '用户未提供 JD，仅根据岗位方向判断'}`,
      `简历原文：${input.resumeText}`,
      `简历模板：${template.title}。${template.instruction}`,
      `修改风格：${style.title}。${style.instruction}`,
      localeInstruction(input.locale),
      '必须保持事实真实，不要编造工作经历、公司、学历、项目、指标或技能。',
      '如果为了优化表达需要推断数字、范围、规模或结果，必须放入“需要用户确认”的字段。',
    ].join('\n\n'),
  };
}

export function buildDiagnosisPrompt(input: ResumeRequestContext) {
  const context = sharedContext(input);
  const fallback = createDeterministicDiagnosis(input);

  return [
    '你是资深招聘顾问和简历优化专家。请诊断候选人简历与目标岗位的匹配程度。',
    context.text,
    '请只返回 JSON，不要返回 Markdown、解释文字或代码块。',
    'JSON schema:',
    `{
  "score": number,
  "level": "low" | "medium" | "high",
  "summary": string,
  "keywordMatches": string[],
  "keywordGaps": string[],
  "strengths": string[],
  "issues": string[],
  "suggestions": string[],
  "sectionScores": {
    "keywords": number,
    "experience": number,
    "ats": number,
    "readability": number
  }
}`,
    `本地初始诊断参考：${JSON.stringify(fallback)}`,
  ].join('\n\n');
}

export function buildOptimizationPrompt(input: ResumeRequestContext) {
  const context = sharedContext(input);
  const fallback = createDeterministicDiagnosis(input);

  return [
    '你是专业简历精修顾问。请根据用户简历、目标岗位/JD、模板和风格，生成一版可直接参考的优化版简历。',
    context.text,
    '优化规则：',
    '- 保留用户真实经历，不要编造事实。',
    '- 原文较弱时，改写为“动作 + 方法 + 结果”的表达。',
    '- 缺少可验证数字时，可以提出量化建议，但必须写入 factsToConfirm。',
    '- 输出要适配所选模板和修改风格。',
    '- 所有推断和需要补充的数据都必须标记为需要用户确认。',
    '请只返回 JSON，不要返回 Markdown、解释文字或代码块。',
    'JSON schema:',
    `{
  "title": string,
  "summary": string,
  "rewrittenResume": string,
  "changeNotes": string[],
  "factsToConfirm": string[],
  "diagnosis": {
    "score": number,
    "level": "low" | "medium" | "high",
    "summary": string,
    "keywordMatches": string[],
    "keywordGaps": string[],
    "strengths": string[],
    "issues": string[],
    "suggestions": string[],
    "sectionScores": {
      "keywords": number,
      "experience": number,
      "ats": number,
      "readability": number
    }
  }
}`,
    `本地初始诊断参考：${JSON.stringify(fallback)}`,
  ].join('\n\n');
}
