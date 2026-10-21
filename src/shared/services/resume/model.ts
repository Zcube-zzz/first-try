import { randomUUID } from 'node:crypto';

import { normalizeResumeSlots } from './draft';
import { createResumeEditor } from './editor';
import { parseModelJson } from './json';
import {
  isPartialResumeRewrite,
  resumeOptimizationModelSchema,
  resumeOptimizationResponseFormat,
  type ResumeOptimizationModelOutput,
} from './model-schema';
import { buildDiagnosisPrompt, buildOptimizationPrompt } from './prompts';
import { createDeterministicDiagnosis } from './scoring';
import { getResumeTemplate } from './templates';
import {
  ResumeDiagnosis,
  ResumeOptimizationResult,
  ResumeRequestContext,
} from './types';
import { getResumeLayoutTemplate } from './visual-templates';

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
  const url = new URL(baseUrl);
  const prefix = url.pathname.replace(/\/+$/, '') || '/v1';
  url.pathname = `${prefix}/chat/completions`;
  return url.toString();
}

async function callResumeModel(
  prompt: string,
  responseFormat?: ReturnType<typeof resumeOptimizationResponseFormat>
) {
  const config = getResumeModelConfig();
  if (!config) {
    return null;
  }

  const response = await fetch(chatCompletionsUrl(config.baseUrl), {
    signal: AbortSignal.timeout(85000),
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
      ...(responseFormat ? { response_format: responseFormat } : {}),
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
  const layout = getResumeLayoutTemplate(input.layoutTemplateId);
  const rewrittenText = input.resumeText.trim();

  return {
    generationStatus: 'fallback',
    paragraphs:
      input.paragraphs ??
      createResumeEditor(rewrittenText).paragraphs.map(({ id, text }) => ({
        id,
        text,
      })),
    slots: input.slots ?? [],
    title: isPartialResumeRewrite(input)
      ? input.draftTitle!
      : `${template.title} · ${layout.title}优化版简历`,
    summary:
      '本次未能生成可靠改写，已保留原文。你可以重试，或补充可核验的职责、具体动作和结果后再精修。',
    rewrittenResume: rewrittenText,
    changes: [],
    confirmationItems: [
      {
        category: 'scope',
        item: '请补充你在项目中的实际职责、具体动作和可核验结果',
        reason:
          '本次未生成可核验改写，请检查原文的职责、动作和结果；未经本人核实，不能把“负责 / 协助”改成“主导”或推测业绩数字',
      },
    ],
    changeNotes: [],
    factsToConfirm: ['请补充项目中的实际职责、具体动作和可核验结果。'],
    diagnosis,
  };
}

function normalizeOptimization(
  value: ResumeOptimizationModelOutput,
  input: ResumeRequestContext
): ResumeOptimizationResult {
  const fallback = fallbackOptimization(input);
  if (
    new Set(value.paragraphs.map((p) => p.id)).size !== input.paragraphs!.length
  )
    throw new Error('Invalid paragraph mapping');
  const returned = new Map(value.paragraphs.map((p) => [p.id, p.text]));
  const protectedParagraphs: string[] = [];
  let paragraphs = input.paragraphs!.map((p) => {
    const text = returned.get(p.id);
    if (!text?.trim()) throw new Error('Missing paragraph');
    // A missing qualifier cannot safely be reattached to a guessed action.
    // Keep the source paragraph instead, including when another qualifier survives.
    const plainText = text.replace(/\{\{[^{}]+\}\}|【待填写[：:][^】]+】/g, '');
    const qualifiers = ['参与', '协助', '配合', '支持', '跟随'];
    const count = (source: string, word: string) =>
      source.split(word).length - 1;
    if (
      qualifiers.some((word) => count(p.text, word) > count(plainText, word)) ||
      (qualifiers.some((word) => p.text.includes(word)) &&
        ['主导', '独立负责', '牵头', '统筹', '全面负责'].some(
          (word) => plainText.includes(word) && !p.text.includes(word)
        ))
    ) {
      protectedParagraphs.push(p.id);
      return { ...p };
    }
    return { id: p.id, text };
  });
  const normalized = normalizeResumeSlots(
    paragraphs.map((paragraph) => paragraph.text),
    [
      ...(input.slots ?? []),
      ...(Array.isArray(value.slots) ? value.slots : []),
    ],
    input.resumeText,
    `slot_${randomUUID().replaceAll('-', '').slice(0, 12)}`
  );
  paragraphs = paragraphs.map((paragraph, index) => ({
    ...paragraph,
    text: normalized.texts[index],
  }));
  const rewrittenResume = paragraphs
    .map((paragraph) => paragraph.text)
    .join('\n');
  const confirmationItems = Array.isArray(value.confirmationItems)
    ? [...value.confirmationItems]
    : [...fallback.confirmationItems];
  const factsToConfirm = confirmationItems.map(
    (item) => `${item.item}：${item.reason}`
  );

  for (const slot of normalized.slots) {
    const field = slot.label;
    if (
      !confirmationItems.some(
        (item) => item.category === 'metric' && item.item.includes(field)
      )
    ) {
      confirmationItems.push({
        category: 'metric',
        item: `请填写：${field}`,
        reason:
          '该字段尚未填写；请由本人核对统计周期、口径和单位后补入真实数据，无法核实时删除对应量化表达。',
      });
    }
    if (!factsToConfirm.some((item) => item.includes(field))) {
      factsToConfirm.push(`请填写真实数据：${field}`);
    }
  }

  return {
    ...fallback,
    ...value,
    generationStatus: 'success',
    paragraphs,
    slots: normalized.slots,
    title: isPartialResumeRewrite(input)
      ? input.draftTitle!
      : 'title' in value && typeof value.title === 'string'
        ? value.title
        : fallback.title,
    summary: value.summary || fallback.summary,
    rewrittenResume,
    changes: value.changes.filter(
      (change) =>
        !input.paragraphs!.some(
          (p) =>
            protectedParagraphs.includes(p.id) &&
            (p.text.includes(change.original) ||
              returned.get(p.id)!.includes(change.revised))
        )
    ),
    confirmationItems,
    changeNotes: [
      ...value.changeNotes,
      ...protectedParagraphs.map(
        (id) =>
          `职责边界保护：${id} 的改写遗漏限定词或新增主导职责，已保留该段原文。`
      ),
    ],
    factsToConfirm,
    diagnosis: fallback.diagnosis,
  };
}

function normalizeDiagnosis(
  value: Partial<ResumeDiagnosis>,
  input: ResumeRequestContext
): ResumeDiagnosis {
  const fallback = createDeterministicDiagnosis(input);

  return {
    ...fallback,
    ...value,
    fitConclusion: value.fitConclusion ?? fallback.fitConclusion,
    issueDetails: Array.isArray(value.issueDetails)
      ? value.issueDetails
      : fallback.issueDetails,
    keywordGapDetails: Array.isArray(value.keywordGapDetails)
      ? value.keywordGapDetails
      : fallback.keywordGapDetails,
    keywordMatches: Array.isArray(value.keywordMatches)
      ? value.keywordMatches
      : fallback.keywordMatches,
    keywordGaps: Array.isArray(value.keywordGaps)
      ? value.keywordGaps
      : fallback.keywordGaps,
    strengths: Array.isArray(value.strengths)
      ? value.strengths
      : fallback.strengths,
    issues: Array.isArray(value.issues) ? value.issues : fallback.issues,
    suggestions: Array.isArray(value.suggestions)
      ? value.suggestions
      : fallback.suggestions,
    sectionScores: value.sectionScores ?? fallback.sectionScores,
  };
}

export async function runResumeDiagnosis(
  input: ResumeRequestContext
): Promise<ResumeDiagnosis> {
  try {
    const content = await callResumeModel(buildDiagnosisPrompt(input));

    if (!content) {
      return createDeterministicDiagnosis(input);
    }

    return normalizeDiagnosis(
      parseModelJson<Partial<ResumeDiagnosis>>(content),
      input
    );
  } catch {
    return createDeterministicDiagnosis(input);
  }
}

export async function runResumeOptimization(
  input: ResumeRequestContext
): Promise<ResumeOptimizationResult> {
  if (isPartialResumeRewrite(input) && !input.draftTitle?.trim())
    throw new Error('Original draft title is required for partial rewriting');
  const prepared = {
    ...input,
    paragraphs:
      input.paragraphs ??
      createResumeEditor(input.resumeText).paragraphs.map(({ id, text }) => ({
        id,
        text,
      })),
  };
  if (!prepared.paragraphs.length) return fallbackOptimization(prepared);
  try {
    const content = await callResumeModel(
      buildOptimizationPrompt(prepared),
      resumeOptimizationResponseFormat(prepared)
    );
    if (!content) return fallbackOptimization(prepared);
    const value = resumeOptimizationModelSchema(prepared).parse(
      parseModelJson(content)
    );
    return normalizeOptimization(value, prepared);
  } catch {
    return fallbackOptimization(prepared);
  }
}
