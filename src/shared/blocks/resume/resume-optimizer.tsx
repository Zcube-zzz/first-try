'use client';

import { ChangeEvent, useMemo, useState, type ReactNode } from 'react';
import {
  AlertCircle,
  ArrowUpRight,
  FileText,
  Loader2,
  SearchCheck,
  UploadCloud,
  WandSparkles,
} from 'lucide-react';

import { Button } from '@/shared/components/ui/button';
import { Textarea } from '@/shared/components/ui/textarea';
import { cn } from '@/shared/lib/utils';
import {
  formatResumeSlotLabels,
  getResumeFillInFields,
} from '@/shared/services/resume/draft';
import {
  RESUME_REWRITE_STYLES,
  RESUME_TEMPLATES,
} from '@/shared/services/resume/templates';
import type {
  ResumeDiagnosis,
  ResumeExtractionResult,
  ResumeOptimizationResult,
} from '@/shared/services/resume/types';

type ApiPayload<T> = {
  code: number;
  message: string;
  data: T;
};

interface ResumeOptimizerCopy {
  uploadTitle?: string;
  uploadHint?: string;
  pasteLabel?: string;
  targetLabel?: string;
  targetPlaceholder?: string;
  jdLabel?: string;
  jdPlaceholder?: string;
  templateTitle?: string;
  styleTitle?: string;
  diagnose?: string;
  optimize?: string;
  parsing?: string;
  diagnosing?: string;
  optimizing?: string;
  diagnosisTitle?: string;
  optimizedTitle?: string;
  factsTitle?: string;
}

export function ResumeOptimizer({
  copy = {},
  locale = 'zh',
}: {
  copy?: ResumeOptimizerCopy;
  locale?: 'zh' | 'en';
}) {
  const defaults = getDefaults(locale);
  const text = { ...defaults, ...copy };
  const [resumeText, setResumeText] = useState('');
  const [targetRole, setTargetRole] = useState('');
  const [jdText, setJdText] = useState('');
  const [templateId, setTemplateId] = useState('product-manager');
  const [styleId, setStyleId] = useState('achievement-focused');
  const [diagnosis, setDiagnosis] = useState<ResumeDiagnosis | null>(null);
  const [optimization, setOptimization] =
    useState<ResumeOptimizationResult | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<'parse' | 'diagnose' | 'optimize' | null>(
    null
  );

  const hasResume = resumeText.trim().length > 0;
  const canRun = hasResume && targetRole.trim().length > 0;

  const templateItems = useMemo(
    () => localizeChoices(RESUME_TEMPLATES, locale, 'template'),
    [locale]
  );
  const styleItems = useMemo(
    () => localizeChoices(RESUME_REWRITE_STYLES, locale, 'style'),
    [locale]
  );
  const selectedTemplate = useMemo(
    () => templateItems.find((template) => template.id === templateId),
    [templateId, templateItems]
  );
  const selectedStyle = useMemo(
    () => styleItems.find((style) => style.id === styleId),
    [styleId, styleItems]
  );

  async function parseFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setBusy('parse');
    setError('');
    setWarnings([]);
    setDiagnosis(null);
    setOptimization(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      const result = await postForm<ResumeExtractionResult>(
        '/api/resume/parse',
        formData
      );
      setResumeText(result.text);
      setWarnings(result.warnings);
      if (!result.text) {
        setError(
          locale === 'en'
            ? 'No text was extracted. Paste the resume text below to continue.'
            : '暂未提取到文本，请在下方粘贴简历文本继续。'
        );
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(null);
      event.target.value = '';
    }
  }

  async function diagnose() {
    if (!canRun) return;

    setBusy('diagnose');
    setError('');
    setOptimization(null);

    try {
      const result = await postJson<ResumeDiagnosis>('/api/resume/diagnose', {
        resumeText,
        targetRole,
        jdText,
        templateId,
        styleId,
        locale,
      });
      setDiagnosis(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(null);
    }
  }

  async function optimize() {
    if (!canRun) return;

    setBusy('optimize');
    setError('');

    try {
      const result = await postJson<ResumeOptimizationResult>(
        '/api/resume/optimize',
        {
          resumeText,
          targetRole,
          jdText,
          templateId,
          styleId,
          locale,
        }
      );
      setOptimization(result);
      setDiagnosis(result.diagnosis);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <label
        className={cn(
          'group relative flex min-h-56 cursor-pointer flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-blue-300 bg-white/80 p-6 text-center shadow-sm transition hover:border-blue-500 hover:bg-blue-50/60 dark:bg-zinc-950/70 dark:hover:bg-blue-950/20',
          busy === 'parse' && 'pointer-events-none opacity-80'
        )}
      >
        <input
          type="file"
          accept=".pdf,.docx,.txt,.md"
          className="sr-only"
          onChange={parseFile}
        />
        <span className="flex size-16 items-center justify-center rounded-md bg-blue-600 text-white shadow-lg shadow-blue-600/20 transition group-hover:scale-105">
          {busy === 'parse' ? (
            <Loader2 className="size-7 animate-spin" />
          ) : (
            <UploadCloud className="size-7" />
          )}
        </span>
        <span className="space-y-2">
          <span className="block text-xl font-semibold">
            {busy === 'parse' ? text.parsing : text.uploadTitle}
          </span>
          <span className="text-muted-foreground block text-sm">
            {text.uploadHint}
          </span>
        </span>
      </label>

      <Textarea
        value={resumeText}
        onChange={(event) => setResumeText(event.target.value)}
        placeholder={text.pasteLabel}
        className={cn(
          'min-h-20 resize-none bg-white/80 dark:bg-zinc-950/70',
          !hasResume && 'sr-only'
        )}
      />

      {warnings.length > 0 ? (
        <Message tone="warning" messages={warnings} />
      ) : null}
      {error ? <Message tone="error" messages={[error]} /> : null}

      {hasResume ? (
        <div className="space-y-4 rounded-lg border bg-white/90 p-4 shadow-sm dark:bg-zinc-950/80">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium">{text.targetLabel}</span>
              <input
                value={targetRole}
                onChange={(event) => setTargetRole(event.target.value)}
                placeholder={text.targetPlaceholder}
                className="border-input bg-background focus-visible:ring-ring h-10 w-full rounded-md border px-3 text-sm outline-none focus-visible:ring-2"
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium">
                {selectedTemplate?.title} / {selectedStyle?.title}
              </span>
              <div className="text-muted-foreground flex h-10 items-center gap-2 rounded-md border px-3 text-sm">
                <FileText className="size-4 text-blue-600" />
                {locale === 'en' ? 'Post-upload settings' : '上传后设置'}
              </div>
            </label>
          </div>

          <label className="space-y-2">
            <span className="text-sm font-medium">{text.jdLabel}</span>
            <Textarea
              value={jdText}
              onChange={(event) => setJdText(event.target.value)}
              placeholder={text.jdPlaceholder}
              className="min-h-24 resize-none"
            />
          </label>

          <ChoiceGroup
            title={text.templateTitle}
            items={templateItems}
            value={templateId}
            onChange={setTemplateId}
          />
          <ChoiceGroup
            title={text.styleTitle}
            items={styleItems}
            value={styleId}
            onChange={setStyleId}
          />

          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              onClick={diagnose}
              disabled={!canRun || Boolean(busy)}
              className="min-w-36"
            >
              {busy === 'diagnose' ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <SearchCheck className="size-4" />
              )}
              {busy === 'diagnose' ? text.diagnosing : text.diagnose}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={optimize}
              disabled={!canRun || Boolean(busy)}
              className="min-w-36"
            >
              {busy === 'optimize' ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <WandSparkles className="size-4" />
              )}
              {busy === 'optimize' ? text.optimizing : text.optimize}
            </Button>
          </div>
        </div>
      ) : null}

      {diagnosis ? (
        <ResultPanel title={text.diagnosisTitle}>
          <div className="grid gap-4 md:grid-cols-[8rem_1fr]">
            <div className="flex size-28 flex-col items-center justify-center rounded-full border-8 border-green-500 text-green-600">
              <span className="text-4xl font-semibold tabular-nums">
                {diagnosis.score}
              </span>
              <span className="text-xs">/ 100</span>
            </div>
            <div className="space-y-3">
              <p className="text-sm">{diagnosis.summary}</p>
              <TagList label="Matched" items={diagnosis.keywordMatches} />
              <TagList label="Gaps" items={diagnosis.keywordGaps} muted />
              <BulletList items={diagnosis.issues} />
            </div>
          </div>
        </ResultPanel>
      ) : null}

      {optimization ? (
        <ResultPanel title={text.optimizedTitle}>
          <p className="text-muted-foreground text-sm">
            {formatResumeSlotLabels(
              optimization.summary,
              optimization.slots,
              locale
            )}
          </p>
          <Textarea
            aria-label={
              locale === 'zh'
                ? '简历草稿（可直接编辑）'
                : 'Editable resume draft'
            }
            value={optimization.rewrittenResume}
            onChange={(event) =>
              setOptimization({
                ...optimization,
                rewrittenResume: event.target.value,
              })
            }
            className="mt-3 min-h-[34rem] resize-y bg-white text-sm leading-7 dark:bg-zinc-950"
          />
          {getResumeFillInFields(optimization.rewrittenResume).length > 0 ? (
            <p role="status" className="mt-2 text-sm text-amber-700">
              {locale === 'zh'
                ? '请本人填写【待填写：字段】中的真实数据，填好或删除相应表达后再投递。'
                : 'Replace fill-in markers with verified data, or remove the incomplete statements before applying.'}
            </p>
          ) : null}
          <BulletList
            items={optimization.changeNotes.map((note) =>
              formatResumeSlotLabels(note, optimization.slots, locale)
            )}
          />
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
            <div className="mb-2 flex items-center gap-2 font-medium">
              <AlertCircle className="size-4" />
              {text.factsTitle}
            </div>
            <BulletList
              items={
                optimization.confirmationItems?.length
                  ? optimization.confirmationItems.map((item) =>
                      formatResumeSlotLabels(
                        `${item.item} ${item.reason}`,
                        optimization.slots,
                        locale
                      )
                    )
                  : optimization.factsToConfirm.map((item) =>
                      formatResumeSlotLabels(item, optimization.slots, locale)
                    )
              }
            />
          </div>
        </ResultPanel>
      ) : null}
    </div>
  );
}

function ChoiceGroup({
  title,
  items,
  value,
  onChange,
}: {
  title: string;
  items: Array<{ id: string; title: string; description: string }>;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="text-sm font-medium">{title}</div>
      <div className="grid gap-2 sm:grid-cols-2">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange(item.id)}
            className={cn(
              'rounded-md border p-3 text-left text-sm transition',
              value === item.id
                ? 'border-blue-500 bg-blue-50 text-blue-950 dark:bg-blue-950/40 dark:text-blue-50'
                : 'hover:bg-muted/60'
            )}
          >
            <span className="block font-medium">{item.title}</span>
            <span className="text-muted-foreground mt-1 block text-xs">
              {item.description}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function Message({
  tone,
  messages,
}: {
  tone: 'warning' | 'error';
  messages: string[];
}) {
  return (
    <div
      className={cn(
        'flex gap-2 rounded-md border p-3 text-sm',
        tone === 'error'
          ? 'border-red-200 bg-red-50 text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-100'
          : 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100'
      )}
    >
      <AlertCircle className="mt-0.5 size-4 shrink-0" />
      <div className="space-y-1">
        {messages.map((message, index) => (
          <p key={index}>{message}</p>
        ))}
      </div>
    </div>
  );
}

function ResultPanel({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-lg border bg-white/90 p-4 shadow-sm dark:bg-zinc-950/80">
      <div className="mb-3 flex items-center gap-2 font-semibold">
        <ArrowUpRight className="size-4 text-green-600" />
        {title}
      </div>
      {children}
    </div>
  );
}

function TagList({
  label,
  items,
  muted = false,
}: {
  label: string;
  items: string[];
  muted?: boolean;
}) {
  if (items.length === 0) return null;

  return (
    <div className="space-y-1">
      <span className="text-muted-foreground text-xs">{label}</span>
      <div className="flex flex-wrap gap-2">
        {items.slice(0, 8).map((item) => (
          <span
            key={item}
            className={cn(
              'rounded-full px-2.5 py-1 text-xs',
              muted
                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-100'
                : 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-100'
            )}
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

function BulletList({ items }: { items: string[] }) {
  if (items.length === 0) return null;

  return (
    <ul className="mt-3 space-y-2 text-sm">
      {items.map((item, index) => (
        <li key={index} className="flex gap-2">
          <span className="mt-2 size-1.5 shrink-0 rounded-full bg-blue-600" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

async function postForm<T>(url: string, formData: FormData): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    body: formData,
  });
  const payload = (await response.json()) as ApiPayload<T>;
  if (!response.ok || payload.code !== 0) {
    throw new Error(payload.message || 'Request failed');
  }
  return payload.data;
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const payload = (await response.json()) as ApiPayload<T>;
  if (!response.ok || payload.code !== 0) {
    throw new Error(payload.message || 'Request failed');
  }
  return payload.data;
}

function getDefaults(locale: 'zh' | 'en'): Required<ResumeOptimizerCopy> {
  if (locale === 'en') {
    return {
      uploadTitle: 'Upload resume',
      uploadHint: 'PDF / DOCX / text, up to 10MB',
      pasteLabel: 'Paste resume text here if extraction needs review',
      targetLabel: 'Target role',
      targetPlaceholder: 'e.g. Growth Product Manager',
      jdLabel: 'JD or role direction',
      jdPlaceholder: 'Paste the job description or describe the role direction',
      templateTitle: 'Choose resume template',
      styleTitle: 'Choose rewrite style',
      diagnose: 'Diagnose fit',
      optimize: 'Optimize resume',
      parsing: 'Parsing resume',
      diagnosing: 'Diagnosing',
      optimizing: 'Optimizing',
      diagnosisTitle: 'Diagnosis result',
      optimizedTitle: 'Optimized resume',
      factsTitle: 'Facts to confirm',
    };
  }

  return {
    uploadTitle: '上传简历',
    uploadHint: '支持 PDF / DOCX / 文本，最大 10MB',
    pasteLabel: '如果识别结果需要调整，也可以直接粘贴简历文本',
    targetLabel: '目标岗位',
    targetPlaceholder: '例如：增长产品经理',
    jdLabel: 'JD 或岗位方向',
    jdPlaceholder: '粘贴目标岗位 JD，或简单描述岗位方向',
    templateTitle: '选择简历模板',
    styleTitle: '选择修改风格',
    diagnose: '诊断匹配度',
    optimize: '开始优化',
    parsing: '正在解析简历',
    diagnosing: '诊断中',
    optimizing: '优化中',
    diagnosisTitle: '诊断结果',
    optimizedTitle: '优化版简历',
    factsTitle: '需要用户确认',
  };
}

function localizeChoices(
  items: Array<{ id: string; title: string; description: string }>,
  locale: 'zh' | 'en',
  kind: 'template' | 'style'
) {
  if (locale === 'zh') return items;

  const templateCopy: Record<string, { title: string; description: string }> = {
    campus: {
      title: 'Campus / Internship',
      description: 'Education, internships, projects, competitions.',
    },
    experienced: {
      title: 'Experienced Hire',
      description: 'Professional summary, core strengths, impact.',
    },
    'product-manager': {
      title: 'Product Manager',
      description: 'Requirements, metrics, delivery, business outcomes.',
    },
    'ai-product-manager': {
      title: 'AI Product Manager',
      description: 'LLM, Agent, Workflow, model application.',
    },
    engineering: {
      title: 'Engineering',
      description: 'Tech stack, systems, complexity, stability.',
    },
  };
  const styleCopy: Record<string, { title: string; description: string }> = {
    'fact-preserving': {
      title: 'Fact-Preserving',
      description: 'Polish wording without adding unverified facts.',
    },
    'ats-friendly': {
      title: 'ATS-Friendly',
      description: 'Strengthen keywords, structure, and readability.',
    },
    'achievement-focused': {
      title: 'Achievement-Focused',
      description: 'Turn duties into action and outcome bullets.',
    },
    'enterprise-cn': {
      title: 'Enterprise Chinese',
      description: 'Professional Chinese style for complex projects.',
    },
  };
  const copy = kind === 'template' ? templateCopy : styleCopy;

  return items.map((item) => ({
    ...item,
    title: copy[item.id]?.title ?? item.title,
    description: copy[item.id]?.description ?? item.description,
  }));
}
