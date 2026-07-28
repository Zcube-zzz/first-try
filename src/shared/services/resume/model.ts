import { parseModelJson } from './json';
import { buildDiagnosisPrompt, buildOptimizationPrompt } from './prompts';
import { createDeterministicDiagnosis } from './scoring';
import { getResumeRewriteStyle, getResumeTemplate } from './templates';
import {
  ResumeDiagnosis,
  ResumeOptimizationResult,
  ResumeRequestContext,
} from './types';

interface ResumeModelConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

interface ChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

function getResumeModelConfig(): ResumeModelConfig | null {
  const apiKey = process.env.EVOLINK_API_KEY || process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    return null;
  }

  return {
    apiKey,
    baseUrl:
      process.env.EVOLINK_BASE_URL ||
      process.env.OPENROUTER_BASE_URL ||
      'https://openrouter.ai/api/v1',
    model:
      process.env.EVOLINK_FREE_MODEL ||
      process.env.RESUMEFIT_FREE_MODEL ||
      'openai/gpt-4o-mini',
  };
}

function chatCompletionsUrl(baseUrl: string) {
  return `${baseUrl.replace(/\/$/, '')}/chat/completions`;
}

async function callResumeModel(prompt: string) {
  const config = getResumeModelConfig();
  if (!config) {
    return null;
  }

  const response = await fetch(chatCompletionsUrl(config.baseUrl), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    throw new Error('Resume model request failed');
  }

  const payload = (await response.json()) as ChatCompletionResponse;
  const content = payload.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('Resume model returned empty content');
  }

  return content;
}

function fallbackOptimization(
  input: ResumeRequestContext
): ResumeOptimizationResult {
  const diagnosis = createDeterministicDiagnosis(input);
  const template = getResumeTemplate(input.templateId);
  const style = getResumeRewriteStyle(input.styleId);
  const improvedScore = Math.min(88, Math.max(diagnosis.score + 12, 62));

  return {
    title: `${template.title}优化版简历`,
    summary: `已按${template.title}模板和${style.title}风格生成初版。`,
    rewrittenResume: [
      input.resumeText
        .replaceAll('负责', '主导')
        .replaceAll('协助', '参与推进')
        .trim(),
      '',
      '优化建议：请补充每段经历的业务背景、具体动作、协作对象和可验证结果。',
    ].join('\n'),
    changeNotes: [
      '将职责型表达改为行动型表达。',
      '补充目标岗位关键词的呈现位置。',
      '保留原始事实，未新增未经确认的经历。',
    ],
    factsToConfirm: [
      '请确认每段经历是否可以补充转化率、用户规模、收入、效率或成本等数据。',
    ],
    diagnosis: {
      ...diagnosis,
      score: improvedScore,
      level: improvedScore >= 80 ? 'high' : improvedScore >= 60 ? 'medium' : 'low',
      summary: '优化后预计匹配度提升，请继续确认事实和指标。',
    },
  };
}

export async function runResumeDiagnosis(
  input: ResumeRequestContext
): Promise<ResumeDiagnosis> {
  const content = await callResumeModel(buildDiagnosisPrompt(input));

  if (!content) {
    return createDeterministicDiagnosis(input);
  }

  return parseModelJson<ResumeDiagnosis>(content);
}

export async function runResumeOptimization(
  input: ResumeRequestContext
): Promise<ResumeOptimizationResult> {
  const content = await callResumeModel(buildOptimizationPrompt(input));

  if (!content) {
    return fallbackOptimization(input);
  }

  return parseModelJson<ResumeOptimizationResult>(content);
}
