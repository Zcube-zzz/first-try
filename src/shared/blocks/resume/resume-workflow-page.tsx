'use client';

import { ChangeEvent, FormEvent, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Loader2,
  SearchCheck,
  UploadCloud,
  WandSparkles,
} from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Textarea } from '@/shared/components/ui/textarea';
import { cn } from '@/shared/lib/utils';
import { trackResumeEvent } from '@/shared/services/resume/analytics';
import { formatResumeSlotLabels } from '@/shared/services/resume/draft';
import {
  getResumeTemplate,
  RESUME_REWRITE_STYLES,
  RESUME_TEMPLATES,
} from '@/shared/services/resume/templates';
import type {
  ResumeConfirmationItem,
  ResumeDiagnosis,
  ResumeLayoutTemplate,
  ResumeOptimizationChange,
  ResumeOptimizationResult,
  ResumeSectionScores,
  ResumeSlot,
  ResumeVisualTheme,
} from '@/shared/services/resume/types';
import {
  RESUME_LAYOUT_TEMPLATES,
  RESUME_VISUAL_THEMES,
} from '@/shared/services/resume/visual-templates';

import { ResumeDraftEditor } from './resume-draft-editor';
import { useResumeWorkflow } from './use-resume-workflow';

export type ResumeWorkflowStep = 'upload' | 'diagnose' | 'optimize';

function getScoreBand(score?: number) {
  if (typeof score !== 'number') return 'unknown';
  if (score < 60) return 'low';
  if (score < 80) return 'medium';
  return 'high';
}

export function ResumeWorkflowPage({
  locale = 'zh',
  initialStep,
}: {
  locale?: string;
  initialStep: ResumeWorkflowStep;
}) {
  const normalizedLocale = locale === 'en' ? 'en' : 'zh';
  const copy = getWorkflowCopy(normalizedLocale);
  const workflow = useResumeWorkflow(normalizedLocale, initialStep);
  const {
    resumeText,
    fileName,
    extractionConfidence,
    targetRole,
    jdText,
    templateId,
    styleId,
    layoutTemplateId,
    visualThemeId,
    warnings,
    diagnosis,
    optimization,
    error,
    busy,
    hasResume,
    canDiagnose,
    canOptimize,
    updateResumeText,
    updateTargetRole,
    updateJdText,
    updateTemplate,
    updateStyle,
    updateLayoutTemplate,
    updateVisualTheme,
    parseFile,
    runDiagnosis,
    runOptimization,
    fillDemo,
  } = workflow;
  const templateItems = useMemo(
    () => localizeChoices(RESUME_TEMPLATES, normalizedLocale, 'template'),
    [normalizedLocale]
  );
  const styleItems = useMemo(
    () => localizeChoices(RESUME_REWRITE_STYLES, normalizedLocale, 'style'),
    [normalizedLocale]
  );
  const layoutTemplateItems = useMemo(
    () => localizeLayoutTemplates(RESUME_LAYOUT_TEMPLATES, normalizedLocale),
    [normalizedLocale]
  );
  const visualThemeItems = useMemo(
    () => localizeVisualThemes(RESUME_VISUAL_THEMES, normalizedLocale),
    [normalizedLocale]
  );

  return (
    <main className="bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_38%,#f6f8fb_100%)] pt-24 pb-20 dark:bg-[linear-gradient(180deg,#020617_0%,#07111f_45%,#020617_100%)]">
      <div className="container">
        <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-medium text-blue-600">{copy.label}</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">
              {copy.steps[initialStep].title}
            </h1>
            <p className="text-muted-foreground mt-4 max-w-2xl text-lg">
              {copy.steps[initialStep].description}
            </p>
          </div>
          <StepNav activeStep={initialStep} copy={copy} />
        </div>

        <div className="grid gap-6 lg:grid-cols-[16rem_1fr]">
          <WorkflowAside
            activeStep={initialStep}
            hasResume={hasResume}
            hasDiagnosis={Boolean(diagnosis)}
            hasOptimization={Boolean(optimization)}
            copy={copy}
          />

          <div className="space-y-5">
            {workflow.notice ? (
              <p
                role="status"
                className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-950"
              >
                {workflow.notice}
              </p>
            ) : null}
            {workflow.storageError ? (
              <Message tone="warning" messages={[workflow.storageError]} />
            ) : null}
            {workflow.parseBlocked ? (
              <Button
                variant="outline"
                onClick={() => workflow.setQualityDialogOpen(true)}
              >
                {normalizedLocale === 'zh'
                  ? '查看解析问题与处理方式'
                  : 'Review extraction warning'}
              </Button>
            ) : null}
            {initialStep === 'upload' ? (
              <UploadPanel
                onFillDemo={fillDemo}
                onContinue={workflow.continueToDiagnosis}
                busy={busy}
                copy={copy}
                error={error}
                extractionConfidence={extractionConfidence}
                fileName={fileName}
                hasResume={hasResume}
                locale={normalizedLocale}
                resumeText={resumeText}
                warnings={warnings}
                onParseFile={parseFile}
                onResumeTextChange={updateResumeText}
              />
            ) : null}

            {initialStep === 'diagnose' ? (
              <DiagnosePanel
                onFillDemo={fillDemo}
                busy={busy}
                canDiagnose={canDiagnose}
                copy={copy}
                diagnosis={diagnosis}
                error={error}
                extractionConfidence={extractionConfidence}
                fileName={fileName}
                hasResume={hasResume}
                jdText={jdText}
                resumeText={resumeText}
                targetRole={targetRole}
                warnings={warnings}
                onJdTextChange={updateJdText}
                onParseFile={parseFile}
                onResumeTextChange={updateResumeText}
                onRunDiagnosis={runDiagnosis}
                onTargetRoleChange={updateTargetRole}
              />
            ) : null}

            {initialStep === 'optimize' ? (
              <OptimizePanel
                onFillDemo={fillDemo}
                busy={busy}
                canOptimize={canOptimize}
                copy={copy}
                error={error}
                extractionConfidence={extractionConfidence}
                fileName={fileName}
                hasResume={hasResume}
                jdText={jdText}
                optimization={optimization}
                layoutTemplateId={layoutTemplateId}
                layoutTemplateItems={layoutTemplateItems}
                resumeText={resumeText}
                styleId={styleId}
                styleItems={styleItems}
                targetRole={targetRole}
                templateId={templateId}
                templateItems={templateItems}
                visualThemeId={visualThemeId}
                visualThemeItems={visualThemeItems}
                warnings={warnings}
                onJdTextChange={updateJdText}
                onLayoutTemplateChange={updateLayoutTemplate}
                onParseFile={parseFile}
                onResumeTextChange={updateResumeText}
                onRunOptimization={() => void runOptimization()}
                onStyleChange={updateStyle}
                onTargetRoleChange={updateTargetRole}
                onTemplateChange={updateTemplate}
                onVisualThemeChange={updateVisualTheme}
              />
            ) : null}
            {initialStep === 'optimize' &&
            workflow.editor.paragraphs.length > 0 ? (
              <Panel
                title={copy.optimizedTitle}
                description={
                  optimization
                    ? formatResumeSlotLabels(
                        optimization.summary,
                        optimization.slots,
                        normalizedLocale
                      )
                    : undefined
                }
              >
                <ResumeDraftEditor
                  editor={workflow.editor}
                  locale={normalizedLocale}
                  title={optimization?.title || targetRole || 'resume'}
                  templateId={templateId}
                  layoutTemplateId={layoutTemplateId}
                  visualThemeId={visualThemeId}
                  busy={Boolean(busy) || !canOptimize}
                  onEdit={workflow.onParagraphEdit}
                  onResolve={workflow.onSlotResolve}
                  onRewrite={(id, override) =>
                    void runOptimization(id, override)
                  }
                />
                {optimization ? (
                  <>
                    <OptimizationChanges
                      copy={copy}
                      changes={optimization.changes ?? []}
                      slots={optimization.slots}
                    />
                    <BulletList
                      items={optimization.changeNotes.map((note) =>
                        formatResumeSlotLabels(
                          note,
                          optimization.slots,
                          normalizedLocale
                        )
                      )}
                    />
                    <ConfirmationChecklist
                      copy={copy}
                      items={optimization.confirmationItems ?? []}
                      slots={optimization.slots}
                    />
                    <FeedbackPanel copy={copy} kind="optimization" />
                  </>
                ) : null}
              </Panel>
            ) : null}
          </div>
        </div>
      </div>
      <input
        ref={workflow.wordInputRef}
        hidden
        type="file"
        accept=".docx"
        onChange={parseFile}
        aria-label="重新上传 Word 文件"
      />
      <Dialog
        open={workflow.qualityDialogOpen}
        onOpenChange={workflow.setQualityDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {normalizedLocale === 'zh'
                ? '检测到该文件排版复杂或为图片扫描件，可能会影响诊断准确度'
                : 'This file may have complex layout or scanned images. Extraction quality may affect diagnosis.'}
            </DialogTitle>
            <DialogDescription>
              {normalizedLocale === 'zh'
                ? '提取文字过少或杂质字符较多，请检查内容后选择继续方式。'
                : 'Too little text or too many unreadable characters were detected. Review the content before continuing.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={workflow.chooseManualPaste}>
              {normalizedLocale === 'zh'
                ? '切换为手动粘贴文本'
                : 'Paste text manually'}
            </Button>
            <Button variant="outline" onClick={workflow.requestWordUpload}>
              {normalizedLocale === 'zh'
                ? '重新上传 Word 文件'
                : 'Upload Word instead'}
            </Button>
          </DialogFooter>
          <button
            type="button"
            className="text-muted-foreground text-sm underline disabled:opacity-50"
            disabled={!hasResume}
            onClick={workflow.forceContinue}
          >
            {normalizedLocale === 'zh' ? '仍然强制继续' : 'Continue anyway'}
          </button>
        </DialogContent>
      </Dialog>
    </main>
  );
}

function StepNav({
  activeStep,
  copy,
}: {
  activeStep: ResumeWorkflowStep;
  copy: WorkflowCopy;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {Object.entries(copy.steps).map(([step, item]) => (
        <Button
          key={step}
          asChild
          variant={activeStep === step ? 'default' : 'outline'}
        >
          <Link href={item.href}>{item.nav}</Link>
        </Button>
      ))}
    </div>
  );
}

function WorkflowAside({
  activeStep,
  hasResume,
  hasDiagnosis,
  hasOptimization,
  copy,
}: {
  activeStep: ResumeWorkflowStep;
  hasResume: boolean;
  hasDiagnosis: boolean;
  hasOptimization: boolean;
  copy: WorkflowCopy;
}) {
  const states = [
    { step: 'upload', done: hasResume },
    { step: 'diagnose', done: hasDiagnosis },
    { step: 'optimize', done: hasOptimization },
  ] as const;

  return (
    <aside className="h-fit rounded-lg border bg-white p-4 shadow-sm dark:bg-zinc-950">
      <div className="text-sm font-semibold">{copy.progressTitle}</div>
      <div className="mt-4 space-y-3">
        {states.map((state, index) => {
          const item = copy.steps[state.step];
          const active = activeStep === state.step;

          return (
            <div key={state.step} className="flex gap-3">
              <div
                className={cn(
                  'flex size-7 shrink-0 items-center justify-center rounded-md border text-xs font-semibold',
                  state.done
                    ? 'border-green-500 bg-green-50 text-green-700 dark:bg-green-950/30'
                    : active
                      ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/30'
                      : 'text-muted-foreground'
                )}
              >
                {state.done ? <CheckCircle2 className="size-4" /> : index + 1}
              </div>
              <div>
                <div className="text-sm font-medium">{item.nav}</div>
                <div className="text-muted-foreground text-xs">
                  {item.aside}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}

function UploadPanel({
  onContinue,
  busy,
  copy,
  error,
  extractionConfidence,
  fileName,
  hasResume,
  locale,
  resumeText,
  warnings,
  onFillDemo,
  onParseFile,
  onResumeTextChange,
}: {
  onContinue: () => void;
  busy: 'parse' | 'diagnose' | 'optimize' | null;
  copy: WorkflowCopy;
  error: string;
  extractionConfidence: number | null;
  fileName: string;
  hasResume: boolean;
  locale: 'zh' | 'en';
  resumeText: string;
  warnings: string[];
  onFillDemo: () => void;
  onParseFile: (event: ChangeEvent<HTMLInputElement>) => void;
  onResumeTextChange: (value: string) => void;
}) {
  return (
    <Panel title={copy.uploadPanelTitle} description={copy.uploadPanelDesc}>
      <ResumeInput
        onFillDemo={onFillDemo}
        busy={busy}
        copy={copy}
        extractionConfidence={extractionConfidence}
        fileName={fileName}
        locale={locale}
        resumeText={resumeText}
        warnings={warnings}
        onParseFile={onParseFile}
        onResumeTextChange={onResumeTextChange}
      />
      {error ? <Message tone="error" messages={[error]} /> : null}
      <Button disabled={!hasResume || Boolean(busy)} onClick={onContinue}>
        {copy.enterDiagnose}
        <ArrowRight className="size-4" />
      </Button>
    </Panel>
  );
}

function DiagnosePanel({
  busy,
  canDiagnose,
  copy,
  diagnosis,
  error,
  extractionConfidence,
  fileName,
  hasResume,
  jdText,
  resumeText,
  targetRole,
  warnings,
  onJdTextChange,
  onFillDemo,
  onParseFile,
  onResumeTextChange,
  onRunDiagnosis,
  onTargetRoleChange,
}: {
  busy: 'parse' | 'diagnose' | 'optimize' | null;
  canDiagnose: boolean;
  copy: WorkflowCopy;
  diagnosis: ResumeDiagnosis | null;
  error: string;
  extractionConfidence: number | null;
  fileName: string;
  hasResume: boolean;
  jdText: string;
  resumeText: string;
  targetRole: string;
  warnings: string[];
  onJdTextChange: (value: string) => void;
  onFillDemo: () => void;
  onParseFile: (event: ChangeEvent<HTMLInputElement>) => void;
  onResumeTextChange: (value: string) => void;
  onRunDiagnosis: () => void;
  onTargetRoleChange: (value: string) => void;
}) {
  return (
    <>
      <Panel
        title={copy.diagnosePanelTitle}
        description={copy.diagnosePanelDesc}
      >
        <ResumeInput
          onFillDemo={onFillDemo}
          busy={busy}
          copy={copy}
          extractionConfidence={extractionConfidence}
          fileName={fileName}
          locale={copy.locale}
          resumeText={resumeText}
          warnings={warnings}
          compact={hasResume}
          onParseFile={onParseFile}
          onResumeTextChange={onResumeTextChange}
        />
        <TargetFields
          onFillDemo={onFillDemo}
          copy={copy}
          jdText={jdText}
          targetRole={targetRole}
          onJdTextChange={onJdTextChange}
          onTargetRoleChange={onTargetRoleChange}
        />
        {error ? <Message tone="error" messages={[error]} /> : null}
        <Button
          type="button"
          disabled={!canDiagnose || Boolean(busy)}
          onClick={onRunDiagnosis}
        >
          {busy === 'diagnose' ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <SearchCheck className="size-4" />
          )}
          {busy === 'diagnose' ? copy.diagnosing : copy.runDiagnose}
        </Button>
      </Panel>

      {diagnosis ? <DiagnosisResult copy={copy} diagnosis={diagnosis} /> : null}
    </>
  );
}

function OptimizePanel({
  busy,
  canOptimize,
  copy,
  error,
  extractionConfidence,
  fileName,
  hasResume,
  jdText,
  layoutTemplateId,
  layoutTemplateItems,
  optimization,
  resumeText,
  styleId,
  styleItems,
  targetRole,
  templateId,
  templateItems,
  visualThemeId,
  visualThemeItems,
  warnings,
  onJdTextChange,
  onLayoutTemplateChange,
  onFillDemo,
  onParseFile,
  onResumeTextChange,
  onRunOptimization,
  onStyleChange,
  onTargetRoleChange,
  onTemplateChange,
  onVisualThemeChange,
}: {
  busy: 'parse' | 'diagnose' | 'optimize' | null;
  canOptimize: boolean;
  copy: WorkflowCopy;
  error: string;
  extractionConfidence: number | null;
  fileName: string;
  hasResume: boolean;
  jdText: string;
  layoutTemplateId: string;
  layoutTemplateItems: ResumeLayoutTemplate[];
  optimization: ResumeOptimizationResult | null;
  resumeText: string;
  styleId: string;
  styleItems: Array<{ id: string; title: string; description: string }>;
  targetRole: string;
  templateId: string;
  templateItems: Array<{ id: string; title: string; description: string }>;
  visualThemeId: string;
  visualThemeItems: ResumeVisualTheme[];
  warnings: string[];
  onJdTextChange: (value: string) => void;
  onLayoutTemplateChange: (value: string) => void;
  onFillDemo: () => void;
  onParseFile: (event: ChangeEvent<HTMLInputElement>) => void;
  onResumeTextChange: (value: string) => void;
  onRunOptimization: () => void;
  onStyleChange: (value: string) => void;
  onTargetRoleChange: (value: string) => void;
  onTemplateChange: (value: string) => void;
  onVisualThemeChange: (value: string) => void;
}) {
  const selectedLayoutTemplate =
    layoutTemplateItems.find((item) => item.id === layoutTemplateId) ??
    layoutTemplateItems[0];
  const selectedVisualTheme =
    visualThemeItems.find((item) => item.id === visualThemeId) ??
    visualThemeItems[0];
  const selectedScenario = getResumeTemplate(templateId);
  const recommendedLayout = layoutTemplateItems.find(
    (item) => item.id === selectedScenario.recommendedLayoutId
  );
  const recommendedStyle = styleItems.find(
    (item) => item.id === selectedScenario.recommendedStyleId
  );
  const recommendedTheme = visualThemeItems.find(
    (item) => item.id === selectedScenario.recommendedVisualThemeId
  );

  function handleScenarioChange(value: string) {
    const scenario = getResumeTemplate(value);
    onTemplateChange(value);
    onLayoutTemplateChange(scenario.recommendedLayoutId);
    onStyleChange(scenario.recommendedStyleId);
    onVisualThemeChange(scenario.recommendedVisualThemeId);
  }

  return (
    <>
      <Panel
        title={copy.optimizePanelTitle}
        description={copy.optimizePanelDesc}
      >
        <ResumeInput
          onFillDemo={onFillDemo}
          busy={busy}
          copy={copy}
          extractionConfidence={extractionConfidence}
          fileName={fileName}
          locale={copy.locale}
          resumeText={resumeText}
          warnings={warnings}
          compact={hasResume}
          onParseFile={onParseFile}
          onResumeTextChange={onResumeTextChange}
        />
        <TargetFields
          onFillDemo={onFillDemo}
          copy={copy}
          jdText={jdText}
          targetRole={targetRole}
          onJdTextChange={onJdTextChange}
          onTargetRoleChange={onTargetRoleChange}
        />
        <ChoiceGroup
          title={copy.templateTitle}
          items={templateItems}
          value={templateId}
          onChange={handleScenarioChange}
        />
        <ScenarioRecommendation
          copy={copy}
          scenario={selectedScenario}
          layoutTitle={recommendedLayout?.title}
          styleTitle={recommendedStyle?.title}
          themeTitle={recommendedTheme?.title}
        />
        <LayoutTemplateGroup
          title={copy.layoutTemplateTitle}
          items={layoutTemplateItems}
          value={layoutTemplateId}
          onChange={onLayoutTemplateChange}
        />
        <VisualThemeGroup
          title={copy.visualThemeTitle}
          items={visualThemeItems}
          value={visualThemeId}
          onChange={onVisualThemeChange}
        />
        {selectedLayoutTemplate && selectedVisualTheme ? (
          <ResumeTemplateSamplePreview
            copy={copy}
            template={selectedLayoutTemplate}
            theme={selectedVisualTheme}
          />
        ) : null}
        <ChoiceGroup
          title={copy.styleTitle}
          items={styleItems}
          value={styleId}
          onChange={onStyleChange}
        />
        {error ? <Message tone="error" messages={[error]} /> : null}
        <Button
          type="button"
          disabled={!canOptimize || Boolean(busy)}
          onClick={onRunOptimization}
        >
          {busy === 'optimize' ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <WandSparkles className="size-4" />
          )}
          {busy === 'optimize' ? copy.optimizing : copy.runOptimize}
        </Button>
      </Panel>
    </>
  );
}

function ScenarioRecommendation({
  copy,
  scenario,
  layoutTitle,
  styleTitle,
  themeTitle,
}: {
  copy: WorkflowCopy;
  scenario: ReturnType<typeof getResumeTemplate>;
  layoutTitle?: string;
  styleTitle?: string;
  themeTitle?: string;
}) {
  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50/60 p-4 dark:border-blue-900/60 dark:bg-blue-950/20">
      <div className="text-sm font-semibold">{copy.scenarioStrategyTitle}</div>
      <p className="text-muted-foreground mt-1 text-sm leading-6">
        {scenario.strategy}
      </p>
      <div className="mt-3 grid gap-2 text-xs sm:grid-cols-3">
        <RecommendationItem
          label={copy.recommendedLayoutLabel}
          value={layoutTitle}
        />
        <RecommendationItem
          label={copy.recommendedStyleLabel}
          value={styleTitle}
        />
        <RecommendationItem
          label={copy.recommendedThemeLabel}
          value={themeTitle}
        />
      </div>
      <p className="text-muted-foreground mt-3 text-xs">
        {copy.manualAdjustHint}
      </p>
    </div>
  );
}

function RecommendationItem({
  label,
  value,
}: {
  label: string;
  value?: string;
}) {
  return (
    <div className="rounded-md border border-blue-100 bg-white/70 p-2 dark:border-blue-900/50 dark:bg-zinc-950/40">
      <div className="text-muted-foreground">{label}</div>
      <div className="mt-1 font-medium">{value ?? '—'}</div>
    </div>
  );
}

function ResumeInput({
  busy,
  compact = false,
  copy,
  extractionConfidence,
  fileName,
  resumeText,
  warnings,
  onFillDemo,
  onParseFile,
  onResumeTextChange,
}: {
  busy: 'parse' | 'diagnose' | 'optimize' | null;
  compact?: boolean;
  copy: WorkflowCopy;
  extractionConfidence: number | null;
  fileName: string;
  locale: 'zh' | 'en';
  resumeText: string;
  warnings: string[];
  onFillDemo: () => void;
  onParseFile: (event: ChangeEvent<HTMLInputElement>) => void;
  onResumeTextChange: (value: string) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={Boolean(busy)}
          onClick={onFillDemo}
        >
          {copy.locale === 'zh' ? '填入测试 Demo' : 'Fill test demo'}
        </Button>
      </div>
      <label
        className={cn(
          'group flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-blue-300 bg-blue-50/40 p-6 text-center transition hover:border-blue-500 hover:bg-blue-50 dark:bg-blue-950/10 dark:hover:bg-blue-950/20',
          compact && 'min-h-28 p-4',
          busy === 'parse' && 'pointer-events-none opacity-80'
        )}
      >
        <input
          type="file"
          accept=".pdf,.docx,.txt,.md"
          className="sr-only"
          onChange={onParseFile}
        />
        <span className="flex size-12 items-center justify-center rounded-md bg-blue-600 text-white">
          {busy === 'parse' ? (
            <Loader2 className="size-5 animate-spin" />
          ) : (
            <UploadCloud className="size-5" />
          )}
        </span>
        <span>
          <span className="block font-semibold">
            {busy === 'parse' ? copy.parsing : copy.uploadTitle}
          </span>
          <span className="text-muted-foreground mt-1 block text-sm">
            {fileName || copy.uploadHint}
          </span>
        </span>
      </label>

      <Textarea
        data-resume-input
        disabled={busy === 'parse'}
        value={resumeText}
        onChange={(event) => onResumeTextChange(event.target.value)}
        placeholder={copy.pastePlaceholder}
        className="min-h-36 resize-none bg-white dark:bg-zinc-950"
      />
      {typeof extractionConfidence === 'number' ? (
        <div
          className={cn(
            'flex flex-wrap items-center gap-2 rounded-md border px-3 py-2 text-sm',
            extractionConfidence < 0.65
              ? 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200'
              : 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200'
          )}
        >
          <AlertCircle className="size-4" />
          <span>
            {copy.ocrConfidence}: {Math.round(extractionConfidence * 100)}%
          </span>
          {extractionConfidence < 0.65 ? (
            <span className="font-medium">{copy.ocrLowConfidence}</span>
          ) : null}
        </div>
      ) : null}
      {warnings.length > 0 ? (
        <Message tone="warning" messages={warnings} />
      ) : null}
    </div>
  );
}

function TargetFields({
  onFillDemo,
  copy,
  jdText,
  targetRole,
  onJdTextChange,
  onTargetRoleChange,
}: {
  onFillDemo: () => void;
  copy: WorkflowCopy;
  jdText: string;
  targetRole: string;
  onJdTextChange: (value: string) => void;
  onTargetRoleChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-4">
      <label className="space-y-2">
        <span className="text-sm font-medium">{copy.targetLabel}</span>
        <input
          value={targetRole}
          onChange={(event) => onTargetRoleChange(event.target.value)}
          placeholder={copy.targetPlaceholder}
          className="border-input bg-background focus-visible:ring-ring h-10 w-full rounded-md border px-3 text-sm outline-none focus-visible:ring-2"
        />
      </label>
      <label className="space-y-2">
        <span className="text-sm font-medium">{copy.jdLabel}</span>
        <Textarea
          value={jdText}
          onChange={(event) => onJdTextChange(event.target.value)}
          placeholder={copy.jdPlaceholder}
          className="min-h-28 resize-none bg-white dark:bg-zinc-950"
        />
      </label>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-fit justify-self-end"
        onClick={onFillDemo}
      >
        {copy.locale === 'zh' ? '填入测试 Demo' : 'Fill test demo'}
      </Button>
    </div>
  );
}

function DiagnosisResult({
  copy,
  diagnosis,
}: {
  copy: WorkflowCopy;
  diagnosis: ResumeDiagnosis;
}) {
  const fitConclusion = diagnosis.fitConclusion;
  const issueDetails = diagnosis.issueDetails ?? [];
  const keywordGapDetails = diagnosis.keywordGapDetails ?? [];

  return (
    <Panel title={copy.diagnosisTitle} description={diagnosis.summary}>
      {fitConclusion ? (
        <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50/70 p-4 dark:border-blue-900/60 dark:bg-blue-950/20">
          <div className="mb-3 text-sm font-semibold">
            {copy.fitConclusionTitle}
          </div>
          <div className="grid gap-3 text-sm md:grid-cols-3">
            <DiagnosisConclusionItem
              label={copy.currentDirectionLabel}
              value={fitConclusion.currentDirection}
            />
            <DiagnosisConclusionItem
              label={copy.targetNeedsLabel}
              value={fitConclusion.targetNeeds}
            />
            <DiagnosisConclusionItem
              label={copy.mainGapLabel}
              value={fitConclusion.mainGap}
            />
          </div>
        </div>
      ) : null}
      <div className="grid gap-6 md:grid-cols-[10rem_1fr]">
        <div className="flex h-48 items-end gap-3 rounded-lg border bg-slate-50 p-4 dark:bg-zinc-900">
          <div className="h-full w-8 rounded-full bg-slate-200 dark:bg-zinc-800">
            <div
              className="mt-auto w-full rounded-full bg-blue-600 transition-all"
              style={{ height: `${diagnosis.score}%` }}
            />
          </div>
          <div>
            <div className="text-4xl font-semibold tabular-nums">
              {diagnosis.score}
            </div>
            <div className="text-muted-foreground text-xs">/ 100</div>
          </div>
        </div>
        <div className="space-y-4">
          <SectionScoreBars copy={copy} scores={diagnosis.sectionScores} />
          <TagList label={copy.matched} items={diagnosis.keywordMatches} />
          <TagList label={copy.gaps} items={diagnosis.keywordGaps} muted />
        </div>
      </div>
      <div className="mt-6 grid gap-5 border-t pt-5 md:grid-cols-3">
        <DiagnosisInsight
          title={copy.strengthsTitle}
          items={diagnosis.strengths}
          empty={copy.emptyInsight}
          tone="green"
        />
        <DiagnosisInsight
          title={copy.issuesTitle}
          items={diagnosis.issues}
          empty={copy.emptyInsight}
          tone="amber"
        />
        <DiagnosisInsight
          title={copy.suggestionsTitle}
          items={diagnosis.suggestions}
          empty={copy.emptyInsight}
          tone="blue"
        />
      </div>
      {issueDetails.length > 0 ? (
        <DiagnosisIssueList copy={copy} issues={issueDetails} />
      ) : null}
      {keywordGapDetails.length > 0 ? (
        <KeywordGapDetails copy={copy} items={keywordGapDetails} />
      ) : null}
      <Button asChild className="mt-5">
        <Link href="/resume/optimize">
          {copy.startOptimize}
          <ArrowRight className="size-4" />
        </Link>
      </Button>
      <FeedbackPanel copy={copy} kind="diagnosis" score={diagnosis.score} />
    </Panel>
  );
}

function DiagnosisConclusionItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border border-blue-100 bg-white/70 p-3 dark:border-blue-900/50 dark:bg-zinc-950/40">
      <div className="text-muted-foreground mb-1 text-xs">{label}</div>
      <div className="leading-6">{value}</div>
    </div>
  );
}

function DiagnosisIssueList({
  copy,
  issues,
}: {
  copy: WorkflowCopy;
  issues: ResumeDiagnosis['issueDetails'];
}) {
  return (
    <div className="mt-6 border-t pt-5">
      <div className="mb-3 text-sm font-semibold">{copy.issueDetailsTitle}</div>
      <div className="space-y-4">
        {issues.map((issue, index) => (
          <div
            key={`${issue.title}-${index}`}
            className="rounded-lg border p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="font-medium">
                {copy.issueLabel} {index + 1}：{issue.title}
              </div>
              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-100">
                {copy.priorityLabels[issue.priority]}
              </span>
            </div>
            <div className="mt-3 grid gap-3 text-sm md:grid-cols-2">
              <DiagnosisDetail
                label={copy.problemLabel}
                value={issue.description}
              />
              <DiagnosisDetail
                label={copy.evidenceLabel}
                value={issue.evidence}
              />
              <DiagnosisDetail label={copy.impactLabel} value={issue.impact} />
              <DiagnosisDetail
                label={copy.suggestionLabel}
                value={issue.suggestion}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DiagnosisDetail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-muted-foreground mb-1 text-xs">{label}</div>
      <div className="leading-6">{value}</div>
    </div>
  );
}

function KeywordGapDetails({
  copy,
  items,
}: {
  copy: WorkflowCopy;
  items: ResumeDiagnosis['keywordGapDetails'];
}) {
  return (
    <div className="mt-6 border-t pt-5">
      <div className="mb-3 text-sm font-semibold">
        {copy.keywordGapDetailsTitle}
      </div>
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.keyword} className="rounded-md border p-3 text-sm">
            <div className="font-medium">{item.keyword}</div>
            <div className="text-muted-foreground mt-1 leading-6">
              {item.reason}
            </div>
            <div className="mt-1 leading-6">{item.evidence}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SectionScoreBars({
  copy,
  scores,
}: {
  copy: WorkflowCopy;
  scores: ResumeSectionScores;
}) {
  const items: Array<{
    key: keyof ResumeSectionScores;
    label: string;
    value: number;
  }> = [
    {
      key: 'keywords',
      label: copy.sectionScoreLabels.keywords,
      value: scores.keywords,
    },
    {
      key: 'experience',
      label: copy.sectionScoreLabels.experience,
      value: scores.experience,
    },
    { key: 'ats', label: copy.sectionScoreLabels.ats, value: scores.ats },
    {
      key: 'readability',
      label: copy.sectionScoreLabels.readability,
      value: scores.readability,
    },
  ];

  return (
    <div className="space-y-3">
      <div className="text-sm font-medium">{copy.sectionScoreTitle}</div>
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <div key={item.key} className="space-y-1.5">
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="text-muted-foreground">{item.label}</span>
              <span className="font-medium tabular-nums">{item.value}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-zinc-800">
              <div
                className="h-full rounded-full bg-blue-600"
                style={{ width: `${item.value}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DiagnosisInsight({
  title,
  items,
  empty,
  tone,
}: {
  title: string;
  items: string[];
  empty: string;
  tone: 'green' | 'amber' | 'blue';
}) {
  const toneClass = {
    green: 'bg-green-600',
    amber: 'bg-amber-500',
    blue: 'bg-blue-600',
  }[tone];

  return (
    <div>
      <div className="mb-3 text-sm font-semibold">{title}</div>
      {items.length > 0 ? (
        <ul className="space-y-2 text-sm">
          {items.map((item, index) => (
            <li key={index} className="flex gap-2 leading-6">
              <span
                className={cn('mt-2 size-1.5 shrink-0 rounded-full', toneClass)}
              />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground text-sm">{empty}</p>
      )}
    </div>
  );
}

type FeedbackPanelProps = {
  copy: WorkflowCopy;
  kind: 'diagnosis' | 'optimization';
  score?: number;
};

function FeedbackPanel({ copy, kind, score }: FeedbackPanelProps) {
  const [diagnosisAccuracy, setDiagnosisAccuracy] = useState('');
  const [diagnosisHelpfulArea, setDiagnosisHelpfulArea] = useState('');
  const [diagnosisHelpful, setDiagnosisHelpful] = useState('');
  const [useIntent, setUseIntent] = useState('');
  const [truthConcern, setTruthConcern] = useState('');
  const [payInterest, setPayInterest] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const canSubmit =
    kind === 'diagnosis'
      ? Boolean(diagnosisAccuracy)
      : Boolean(useIntent && truthConcern && payInterest);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;

    if (kind === 'diagnosis') {
      trackResumeEvent('resume_diagnosis_feedback_submitted', {
        locale: copy.locale,
        accuracy: diagnosisAccuracy,
        helpfulArea: diagnosisHelpfulArea || 'not_set',
        scoreBand: getScoreBand(score),
        hasComment: Boolean(diagnosisHelpful.trim()),
      });
    } else {
      trackResumeEvent('resume_optimization_feedback_submitted', {
        locale: copy.locale,
        useIntent,
        truthConcern,
        payInterest,
      });
    }

    setSubmitted(true);
  }

  return (
    <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
      <div className="text-sm font-semibold">
        {kind === 'diagnosis'
          ? copy.diagnosisFeedbackTitle
          : copy.optimizationFeedbackTitle}
      </div>
      <p className="text-muted-foreground mt-1 text-sm leading-6">
        {kind === 'diagnosis'
          ? copy.diagnosisFeedbackDesc
          : copy.optimizationFeedbackDesc}
      </p>
      {submitted ? (
        <div className="mt-3 rounded-md bg-green-50 p-3 text-sm text-green-800 dark:bg-green-950/30 dark:text-green-100">
          {copy.feedbackSubmitted}
        </div>
      ) : (
        <form className="mt-4 space-y-4" onSubmit={submit}>
          {kind === 'diagnosis' ? (
            <>
              <FeedbackChoices
                label={copy.accuracyLabel}
                options={copy.accuracyOptions}
                value={diagnosisAccuracy}
                onChange={setDiagnosisAccuracy}
              />
              <FeedbackChoices
                label={copy.helpfulAreaLabel}
                options={copy.helpfulAreaOptions}
                value={diagnosisHelpfulArea}
                onChange={setDiagnosisHelpfulArea}
              />
              <label className="block text-sm">
                <span className="font-medium">{copy.helpfulLabel}</span>
                <Textarea
                  className="mt-2 min-h-20 bg-white dark:bg-zinc-950"
                  value={diagnosisHelpful}
                  onChange={(event) => setDiagnosisHelpful(event.target.value)}
                  placeholder={copy.helpfulPlaceholder}
                />
              </label>
            </>
          ) : (
            <>
              <FeedbackChoices
                label={copy.useIntentLabel}
                options={copy.useIntentOptions}
                value={useIntent}
                onChange={setUseIntent}
              />
              <FeedbackChoices
                label={copy.truthConcernLabel}
                options={copy.truthConcernOptions}
                value={truthConcern}
                onChange={setTruthConcern}
              />
              <FeedbackChoices
                label={copy.payInterestLabel}
                options={copy.payInterestOptions}
                value={payInterest}
                onChange={setPayInterest}
              />
            </>
          )}
          <Button type="submit" size="sm" disabled={!canSubmit}>
            {copy.submitFeedback}
          </Button>
        </form>
      )}
    </div>
  );
}

function FeedbackChoices({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: Record<string, string>;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {Object.entries(options).map(([optionValue, optionLabel]) => (
          <button
            key={optionValue}
            type="button"
            aria-pressed={value === optionValue}
            className={cn(
              'rounded-md border px-3 py-2 text-sm transition-colors',
              value === optionValue
                ? 'border-blue-600 bg-blue-50 text-blue-800 dark:bg-blue-950/50 dark:text-blue-100'
                : 'bg-white hover:bg-slate-100 dark:bg-zinc-950 dark:hover:bg-zinc-800'
            )}
            onClick={() => onChange(optionValue)}
          >
            {optionLabel}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function ConfirmationChecklist({
  copy,
  items,
  slots,
}: {
  copy: WorkflowCopy;
  items: ResumeConfirmationItem[];
  slots: ResumeSlot[];
}) {
  return (
    <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
      <div className="flex items-center gap-2 font-semibold">
        <AlertCircle className="size-4" />
        {copy.factsTitle}
      </div>
      <p className="mt-2 text-sm leading-6">{copy.factsIntro}</p>
      {items.length > 0 ? (
        <div className="mt-3 space-y-3">
          {items.map((item, index) => (
            <div
              key={`${item.category}-${index}`}
              className="rounded-md border border-amber-200/80 bg-white/60 p-3 text-sm dark:border-amber-900/60 dark:bg-zinc-950/30"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-amber-200 px-2 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-900 dark:text-amber-100">
                  {copy.confirmationCategoryLabels[item.category]}
                </span>
                <span className="font-medium">
                  {formatResumeSlotLabels(item.item, slots, copy.locale)}
                </span>
              </div>
              <div className="mt-2 leading-6">
                <span className="font-medium">
                  {copy.confirmationReasonLabel}：
                </span>
                {formatResumeSlotLabels(item.reason, slots, copy.locale)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm">{copy.noConfirmationItems}</p>
      )}
    </div>
  );
}

function OptimizationChanges({
  changes,
  copy,
  slots,
}: {
  changes: ResumeOptimizationChange[];
  slots: ResumeSlot[];
  copy: WorkflowCopy;
}) {
  return (
    <div className="mt-6 border-t pt-5">
      <div className="mb-3 text-sm font-semibold">{copy.changesTitle}</div>
      {changes.length > 0 ? (
        <div className="space-y-4">
          {changes.map((change, index) => (
            <div
              key={`${change.type}-${index}`}
              className="rounded-lg border p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-medium">
                  {copy.changeLabel} {index + 1}
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-blue-100 px-2.5 py-1 text-blue-800 dark:bg-blue-950 dark:text-blue-100">
                    {copy.changeTypeLabels[change.type]}
                  </span>
                  {change.needsConfirmation ? (
                    <span className="rounded-full bg-amber-100 px-2.5 py-1 text-amber-800 dark:bg-amber-950 dark:text-amber-100">
                      {copy.confirmationRequiredLabel}
                    </span>
                  ) : null}
                </div>
              </div>
              <div className="mt-3 grid gap-3 text-sm md:grid-cols-2">
                <ComparisonText
                  label={copy.originalTextLabel}
                  value={formatResumeSlotLabels(
                    change.original,
                    slots,
                    copy.locale
                  )}
                />
                <ComparisonText
                  label={copy.revisedTextLabel}
                  value={formatResumeSlotLabels(
                    change.revised,
                    slots,
                    copy.locale
                  )}
                />
              </div>
              <ComparisonText
                label={copy.changeReasonLabel}
                value={formatResumeSlotLabels(
                  change.reason,
                  slots,
                  copy.locale
                )}
                className="mt-3"
              />
            </div>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground text-sm leading-6">
          {copy.noVerifiedChanges}
        </p>
      )}
    </div>
  );
}

function ComparisonText({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="text-muted-foreground mb-1 text-xs">{label}</div>
      <div className="rounded-md bg-slate-50 p-3 leading-6 whitespace-pre-wrap dark:bg-zinc-900">
        {value}
      </div>
    </div>
  );
}

function LayoutTemplateGroup({
  title,
  items,
  value,
  onChange,
}: {
  title: string;
  items: ResumeLayoutTemplate[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="text-sm font-medium">{title}</div>
      <div className="grid gap-3 lg:grid-cols-3">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange(item.id)}
            className={cn(
              'rounded-lg border p-3 text-left transition hover:border-blue-400 hover:bg-blue-50/60 dark:hover:bg-blue-950/20',
              value === item.id &&
                'border-blue-500 bg-blue-50 text-blue-950 dark:bg-blue-950/40 dark:text-blue-50'
            )}
          >
            <span className="block text-sm font-semibold">{item.title}</span>
            <span className="text-muted-foreground mt-1 block text-xs leading-5">
              {item.description}
            </span>
            <span className="mt-2 block text-xs text-blue-600">
              {item.bestFor}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function ResumeTemplateSamplePreview({
  copy,
  template,
  theme,
}: {
  copy: WorkflowCopy;
  template: ResumeLayoutTemplate;
  theme: ResumeVisualTheme;
}) {
  const isProjectLed = template.id === 'product-results';
  const mainBlocks = template.sampleBlocks;
  const headerBand = template.id === 'business-professional';
  const softCards = template.id === 'business-professional';

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-medium">{copy.previewTitle}</div>
          <div className="text-muted-foreground mt-1 text-xs">
            {template.title} / {theme.title}
          </div>
        </div>
        <div className="flex gap-1.5">
          {theme.swatches.map((swatch) => (
            <span
              key={swatch}
              className="size-5 rounded-full border border-black/10"
              style={{ backgroundColor: swatch }}
            />
          ))}
        </div>
      </div>

      <div className="overflow-auto rounded-lg border bg-slate-100 p-4 dark:bg-zinc-900">
        <div
          className="mx-auto min-h-[42rem] w-full max-w-[46rem] rounded-md border bg-white p-7 text-slate-950 shadow-sm"
          style={{ backgroundColor: theme.background }}
        >
          <ResumePreviewHeader
            accentColor={theme.accentColor}
            band={headerBand}
            template={template}
          />

          <div className="mt-6 grid gap-4">
            {mainBlocks.map((block, index) => (
              <ResumePreviewBlock
                key={block.title}
                accentColor={theme.accentColor}
                block={block}
                card={softCards}
                featured={isProjectLed && index >= 2 && index <= 3}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ResumePreviewHeader({
  accentColor,
  band,
  template,
}: {
  accentColor: string;
  band: boolean;
  template: ResumeLayoutTemplate;
}) {
  if (band) {
    return (
      <div
        className="rounded-md p-5 text-white"
        style={{ backgroundColor: accentColor }}
      >
        <div className="text-3xl font-semibold">XXXX</div>
        <div className="mt-2 text-sm opacity-90">
          目标岗位：XXXX · 工作年限：X 年 · 城市：XXXX
        </div>
      </div>
    );
  }

  return (
    <div className="border-b pb-4" style={{ borderColor: accentColor }}>
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-3xl font-semibold">XXXX</div>
          <div className="mt-2 text-sm text-slate-600">
            目标岗位：XXXX · {template.bestFor}
          </div>
        </div>
        <div className="text-sm text-slate-500">
          手机 XXXX · 邮箱 XXXX · 城市 XXXX
        </div>
      </div>
    </div>
  );
}

function ResumePreviewBlock({
  accentColor,
  block,
  card = false,
  featured = false,
}: {
  accentColor: string;
  block: { title: string; lines: string[] };
  card?: boolean;
  featured?: boolean;
}) {
  return (
    <section
      className={cn(
        'space-y-2',
        card && 'rounded-md border border-slate-200 bg-white/75 p-4',
        featured && 'rounded-md border-l-4 bg-white/70 p-3'
      )}
      style={featured ? { borderLeftColor: accentColor } : undefined}
    >
      <div className="flex items-center gap-2">
        <span
          className="h-4 w-1 rounded-full"
          style={{ backgroundColor: accentColor }}
        />
        <h4 className="text-base font-semibold">{block.title}</h4>
      </div>
      <div className="space-y-1.5">
        {block.lines.map((line) => (
          <p key={line} className={cn('leading-6 text-slate-700', 'text-sm')}>
            {line}
          </p>
        ))}
      </div>
    </section>
  );
}

function VisualThemeGroup({
  title,
  items,
  value,
  onChange,
}: {
  title: string;
  items: ResumeVisualTheme[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="text-sm font-medium">{title}</div>
      <div className="grid gap-3 md:grid-cols-3">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange(item.id)}
            className={cn(
              'rounded-lg border p-3 text-left transition hover:border-blue-400 hover:bg-blue-50/60 dark:hover:bg-blue-950/20',
              value === item.id &&
                'border-blue-500 bg-blue-50 text-blue-950 dark:bg-blue-950/40 dark:text-blue-50'
            )}
          >
            <div
              className="flex h-16 items-end gap-2 rounded-md border p-3"
              style={{ backgroundColor: item.background }}
            >
              {item.swatches.map((swatch) => (
                <span
                  key={swatch}
                  className="h-8 flex-1 rounded-sm border border-black/5"
                  style={{ backgroundColor: swatch }}
                />
              ))}
            </div>
            <span className="mt-3 block text-sm font-semibold">
              {item.title}
            </span>
            <span className="text-muted-foreground mt-1 block text-xs leading-5">
              {item.description}
            </span>
          </button>
        ))}
      </div>
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

function Panel({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border bg-white p-5 shadow-sm dark:bg-zinc-950">
      <div className="mb-5">
        <h2 className="text-xl font-semibold">{title}</h2>
        {description ? (
          <p className="text-muted-foreground mt-2 text-sm leading-6">
            {description}
          </p>
        ) : null}
      </div>
      <div className="space-y-5">{children}</div>
    </section>
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
    <ul className="space-y-2 text-sm">
      {items.map((item, index) => (
        <li key={index} className="flex gap-2">
          <span className="mt-2 size-1.5 shrink-0 rounded-full bg-blue-600" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

type WorkflowCopy = ReturnType<typeof getWorkflowCopy>;

function getWorkflowCopy(locale: 'zh' | 'en') {
  if (locale === 'en') {
    return {
      locale,
      label: 'ResumeFit AI Workspace',
      progressTitle: 'Progress',
      uploadTitle: 'Upload resume',
      uploadHint: 'PDF / DOCX / text, up to 10MB',
      pastePlaceholder: 'Paste resume text here if extraction needs review',
      noText: 'No text was extracted. Paste the resume text below to continue.',
      ocrConfidence: 'Extraction confidence',
      ocrLowConfidence: 'Low clarity. Review the text before diagnosis.',
      enterDiagnose: 'Enter diagnosis',
      uploadPanelTitle: 'Upload or paste your resume',
      uploadPanelDesc:
        'Start with the resume file. The diagnosis page will ask for role context next.',
      diagnosePanelTitle: 'Diagnose resume fit',
      diagnosePanelDesc:
        'Add a target role or JD, then generate a first match score and issue list.',
      optimizePanelTitle: 'Choose direction and optimize',
      optimizePanelDesc:
        'Choose the application scenario first. We will recommend an optimization strategy, layout, theme, and rewrite style.',
      targetLabel: 'Target role',
      targetPlaceholder: 'e.g. Growth Product Manager',
      jdLabel: 'JD or role direction',
      jdPlaceholder: 'Paste the job description or describe the role direction',
      layoutTemplateTitle: 'Layout template',
      visualThemeTitle: 'Visual theme',
      previewTitle: 'Resume sample preview',
      templateTitle: 'Application scenario',
      scenarioStrategyTitle: 'Recommended optimization strategy',
      recommendedLayoutLabel: 'Recommended layout',
      recommendedStyleLabel: 'Recommended rewrite style',
      recommendedThemeLabel: 'Recommended theme',
      manualAdjustHint:
        'You can fine-tune the layout, theme, and rewrite style below.',
      styleTitle: 'Rewrite style',
      parsing: 'Parsing resume',
      diagnosing: 'Diagnosing',
      optimizing: 'Optimizing',
      runDiagnose: 'Run diagnosis',
      runOptimize: 'Generate optimized resume',
      diagnosisTitle: 'Diagnosis result',
      fitConclusionTitle: 'Role-fit conclusion',
      currentDirectionLabel: 'Current resume direction',
      targetNeedsLabel: 'Target role focus',
      mainGapLabel: 'Main gap',
      issueDetailsTitle: 'Priority issues',
      issueLabel: 'Issue',
      problemLabel: 'What we found',
      evidenceLabel: 'Resume evidence',
      impactLabel: 'Why it matters',
      suggestionLabel: 'Suggested change',
      keywordGapDetailsTitle: 'Why these keywords matter',
      priorityLabels: {
        must: 'Must fix',
        recommended: 'Recommended',
        optional: 'Optional',
      },
      optimizedTitle: 'Optimized resume',
      changesTitle: 'Before-and-after changes',
      noVerifiedChanges:
        'No itemized change notes were returned. Review the current preview and confirmation items.',
      changeLabel: 'Change',
      originalTextLabel: 'Original',
      revisedTextLabel: 'Revised',
      changeReasonLabel: 'Why this changed',
      confirmationRequiredLabel: 'Needs confirmation',
      factsIntro:
        'These items are not treated as confirmed facts. Check them before using the final resume.',
      confirmationReasonLabel: 'Why to check',
      noConfirmationItems: 'No additional confirmation items were identified.',
      confirmationCategoryLabels: {
        metric: 'Metric',
        skill: 'Skill',
        scope: 'Scope',
        credential: 'Credential',
        experience: 'Experience',
        evidence: 'Evidence',
      },
      changeTypeLabels: {
        expression: 'Expression enhancement',
        structure: 'Structure adjustment',
        keyword: 'Keyword strengthening',
        quantification: 'Quantification',
        focus: 'Experience focus',
        deletion: 'Redundancy removal',
        risk: 'Risk alert',
      },
      factsTitle: 'Facts to confirm',
      diagnosisFeedbackTitle: 'Was this diagnosis accurate?',
      diagnosisFeedbackDesc:
        'Your answer helps us improve diagnosis quality for real job searches.',
      accuracyLabel: 'How accurate was it?',
      accuracyOptions: {
        accurate: 'Accurate',
        partial: 'Partly accurate',
        inaccurate: 'Not accurate',
      },
      helpfulAreaLabel: 'Which part helped most?',
      helpfulAreaOptions: {
        fitConclusion: 'Role-fit conclusion',
        issueEvidence: 'Issue evidence',
        keywordGaps: 'Keyword gaps',
        scoreBreakdown: 'Score breakdown',
        other: 'Other',
      },
      helpfulLabel: 'What was most helpful?',
      helpfulPlaceholder:
        'Optional: tell us which part helped or missed the point.',
      optimizationFeedbackTitle: 'Would you use this optimized resume?',
      optimizationFeedbackDesc:
        'This short feedback helps us decide what to improve before adding more formats or templates.',
      useIntentLabel: 'Would you use it to apply?',
      useIntentOptions: {
        willUse: 'Yes',
        afterEdit: 'After my edits',
        willNotUse: 'No',
      },
      truthConcernLabel: 'Are you worried about inaccurate facts?',
      truthConcernOptions: {
        yes: 'Yes',
        no: 'No',
      },
      payInterestLabel: 'Would you pay for the complete result?',
      payInterestOptions: {
        yes: 'Yes',
        maybe: 'Maybe',
        no: 'No',
      },
      submitFeedback: 'Submit feedback',
      feedbackSubmitted: 'Thanks for sharing your feedback.',
      copyResume: 'Copy resume',
      exportDocx: 'Download DOCX',
      matched: 'Matched keywords',
      gaps: 'Missing keywords',
      sectionScoreTitle: 'Score breakdown',
      sectionScoreLabels: {
        keywords: 'Keywords',
        experience: 'Experience',
        ats: 'ATS structure',
        readability: 'Readability',
      },
      strengthsTitle: 'Strengths',
      issuesTitle: 'Issues',
      suggestionsTitle: 'Next actions',
      emptyInsight:
        'Nothing to show here yet. Add resume or role details and rerun the diagnosis.',
      startOptimize: 'Start optimization',
      steps: {
        upload: {
          nav: 'Upload',
          href: '/resume',
          title: 'Upload resume',
          description:
            'Upload a resume or paste text first. Then continue to role-fit diagnosis.',
          aside: 'Prepare resume text',
        },
        diagnose: {
          nav: 'Diagnosis',
          href: '/resume/diagnose',
          title: 'Resume diagnosis',
          description:
            'Compare the resume with a target role or JD and see the first match score.',
          aside: 'Score role fit',
        },
        optimize: {
          nav: 'Optimization',
          href: '/resume/optimize',
          title: 'Resume optimization',
          description:
            'Choose an application scenario first, then fine-tune the recommended resume strategy and presentation.',
          aside: 'Rewrite with style',
        },
      },
    };
  }

  return {
    locale,
    label: '简历精修 AI 工作台',
    progressTitle: '当前流程',
    uploadTitle: '上传简历',
    uploadHint: '支持 PDF / DOCX / 文本，最大 10MB',
    pastePlaceholder: '如果识别结果需要调整，也可以直接粘贴简历文本',
    noText: '暂未提取到文本，请在下方粘贴简历文本继续。',
    ocrConfidence: '识别可信度',
    ocrLowConfidence: '识别结果可信度偏低，请先校对文本再诊断。',
    enterDiagnose: '进入诊断页',
    uploadPanelTitle: '上传或粘贴简历',
    uploadPanelDesc: '先把简历内容放进系统，下一步再填写目标岗位或 JD。',
    diagnosePanelTitle: '诊断简历匹配度',
    diagnosePanelDesc: '补充目标岗位或 JD，生成第一版匹配分和问题列表。',
    optimizePanelTitle: '选择方向并优化',
    optimizePanelDesc:
      '先选择投递场景，系统会推荐优化策略、排版模板、视觉主题和改写风格。',
    targetLabel: '目标岗位',
    targetPlaceholder: '例如：增长产品经理',
    jdLabel: 'JD 或岗位方向',
    jdPlaceholder: '粘贴目标岗位 JD，或简单描述岗位方向',
    layoutTemplateTitle: '排版模板',
    visualThemeTitle: '视觉风格',
    previewTitle: '简历样板预览',
    templateTitle: '投递场景',
    scenarioStrategyTitle: '系统推荐优化策略',
    recommendedLayoutLabel: '推荐排版',
    recommendedStyleLabel: '推荐改写风格',
    recommendedThemeLabel: '推荐视觉主题',
    manualAdjustHint: '你可以继续微调排版、视觉主题和改写风格。',
    styleTitle: '改写风格',
    parsing: '正在解析简历',
    diagnosing: '诊断中',
    optimizing: '优化中',
    runDiagnose: '开始诊断',
    runOptimize: '生成优化版简历',
    diagnosisTitle: '诊断结果',
    fitConclusionTitle: '岗位匹配结论',
    currentDirectionLabel: '当前简历方向',
    targetNeedsLabel: '目标岗位重点',
    mainGapLabel: '主要差距',
    issueDetailsTitle: '主要问题与修改优先级',
    issueLabel: '问题',
    problemLabel: '问题说明',
    evidenceLabel: '简历原文证据',
    impactLabel: '为什么影响投递',
    suggestionLabel: '修改建议',
    keywordGapDetailsTitle: '关键词差距解释',
    priorityLabels: {
      must: '必须修改',
      recommended: '建议修改',
      optional: '可选优化',
    },
    optimizedTitle: '优化版简历',
    changesTitle: '优化前后对比',
    noVerifiedChanges: '本次未返回逐项修改说明，请核对当前预览和需要确认项。',
    changeLabel: '修改',
    originalTextLabel: '原文',
    revisedTextLabel: '修改后',
    changeReasonLabel: '修改原因',
    confirmationRequiredLabel: '需要确认',
    factsIntro: '以下内容不会被当作已确认事实，请核实后再用于正式投递。',
    confirmationReasonLabel: '确认原因',
    noConfirmationItems: '暂未发现需要额外确认的信息。',
    confirmationCategoryLabels: {
      metric: '指标',
      skill: '技能',
      scope: '职责范围',
      credential: '证书 / 学历',
      experience: '经历事实',
      evidence: '证明材料',
    },
    changeTypeLabels: {
      expression: '表达增强',
      structure: '结构调整',
      keyword: '岗位关键词补强',
      quantification: '结果量化',
      focus: '经历聚焦',
      deletion: '冗余删除',
      risk: '风险提示',
    },
    factsTitle: '需要用户确认',
    diagnosisFeedbackTitle: '这份诊断准确吗？',
    diagnosisFeedbackDesc: '你的反馈会帮助我们改进真实求职场景下的诊断质量。',
    accuracyLabel: '你觉得诊断准确度如何？',
    accuracyOptions: {
      accurate: '准确',
      partial: '部分准确',
      inaccurate: '不准确',
    },
    helpfulAreaLabel: '哪一部分最有帮助？',
    helpfulAreaOptions: {
      fitConclusion: '岗位匹配结论',
      issueEvidence: '问题与原文证据',
      keywordGaps: '关键词差距',
      scoreBreakdown: '维度评分',
      other: '其他',
    },
    helpfulLabel: '你觉得最有帮助的是哪一部分？',
    helpfulPlaceholder: '可选：告诉我们哪一部分有帮助，或哪里没有说到点上。',
    optimizationFeedbackTitle: '你会使用这份优化后的简历吗？',
    optimizationFeedbackDesc:
      '这份反馈会帮助我们决定下一步优先改进内容质量，还是增加更多格式和模板。',
    useIntentLabel: '你会用它去投递吗？',
    useIntentOptions: {
      willUse: '会',
      afterEdit: '修改后会',
      willNotUse: '不会',
    },
    truthConcernLabel: '你是否担心内容不真实？',
    truthConcernOptions: {
      yes: '担心',
      no: '不担心',
    },
    payInterestLabel: '你是否愿意为完整结果付费？',
    payInterestOptions: {
      yes: '愿意',
      maybe: '看价格',
      no: '不愿意',
    },
    submitFeedback: '提交反馈',
    feedbackSubmitted: '感谢你的反馈。',
    copyResume: '复制简历',
    exportDocx: '下载 DOCX',
    matched: '命中关键词',
    gaps: '缺失关键词',
    sectionScoreTitle: '维度评分',
    sectionScoreLabels: {
      keywords: '关键词匹配',
      experience: '经历质量',
      ats: 'ATS 结构',
      readability: '可读性',
    },
    strengthsTitle: '当前优势',
    issuesTitle: '主要问题',
    suggestionsTitle: '优化建议',
    emptyInsight: '当前没有可展示内容；补充简历或岗位信息后可以重新诊断。',
    startOptimize: '开始优化',
    steps: {
      upload: {
        nav: '上传',
        href: '/resume',
        title: '上传简历',
        description: '先上传简历或粘贴文本，然后进入岗位匹配诊断。',
        aside: '准备简历内容',
      },
      diagnose: {
        nav: '诊断',
        href: '/resume/diagnose',
        title: '简历诊断',
        description: '把简历和目标岗位或 JD 做匹配，得到第一版评分。',
        aside: '判断岗位匹配',
      },
      optimize: {
        nav: '优化',
        href: '/resume/optimize',
        title: '简历优化',
        description: '先选择投递场景，再微调系统推荐的优化策略和简历呈现方式。',
        aside: '按风格改写',
      },
    },
  };
}

function localizeChoices(
  items: Array<{ id: string; title: string; description: string }>,
  locale: 'zh' | 'en',
  kind: 'template' | 'style'
) {
  if (locale === 'zh') return items;

  const templateCopy: Record<string, { title: string; description: string }> = {
    'internet-experienced': {
      title: 'Internet Experienced Hire',
      description: 'Product delivery, teamwork, and evidence-based iteration.',
    },
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
    traditional: {
      title: 'State-owned / Banking / Traditional',
      description: 'Professional, stable, formal business expression.',
    },
    'career-change': {
      title: 'Career Change',
      description: 'Transferable skills and target-role relevance.',
    },
    'consulting-functions': {
      title: 'Consulting / Rotational / Functions',
      description: 'Structured analysis, coordination, and business results.',
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

function localizeLayoutTemplates(
  items: ResumeLayoutTemplate[],
  locale: 'zh' | 'en'
) {
  if (locale === 'zh') return items;

  const copy: Record<
    string,
    {
      title: string;
      description: string;
      bestFor: string;
      previewSections: string[];
      sampleBlocks: ResumeLayoutTemplate['sampleBlocks'];
    }
  > = {
    'ats-clean': {
      title: 'ATS Clean',
      description:
        'White, single-column, clear sections for screening systems and fast recruiter scans.',
      bestFor: 'General applications, traditional industries, ATS-heavy roles',
      previewSections: [
        'Contact',
        'Summary',
        'Experience',
        'Projects',
        'Education',
      ],
      sampleBlocks: [
        {
          title: 'Contact',
          lines: ['Name XXXX · Phone XXXX · Email XXXX · City XXXX'],
        },
        {
          title: 'Summary',
          lines: [
            'X years in XXXX, familiar with XXXX, able to own XXXX independently.',
          ],
        },
        {
          title: 'Experience',
          lines: [
            '20XX.XX - 20XX.XX · XXXX Company · XXXX Role',
            'Owned XXXX, used XXXX approach, and improved XXXX by XXXX.',
          ],
        },
        {
          title: 'Projects',
          lines: [
            'XXXX Project · For XXXX scenario',
            'Clarified XXXX problem and delivered XXXX solution.',
          ],
        },
        {
          title: 'Education',
          lines: ['20XX - 20XX · XXXX University · XXXX Major'],
        },
      ],
    },
    'business-professional': {
      title: 'Business Professional',
      description:
        'Structured and calm, with stronger hierarchy for formal career presentation.',
      bestFor: 'Operations, finance, consulting, business roles',
      previewSections: [
        'Profile',
        'Strengths',
        'Experience',
        'Achievements',
        'Education',
      ],
      sampleBlocks: [
        {
          title: 'Profile',
          lines: ['XXXX · XXXX role direction · XXXX city · XXXX contact'],
        },
        {
          title: 'Strengths',
          lines: [
            'XXXX business insight · XXXX project delivery · XXXX analysis · XXXX collaboration',
          ],
        },
        {
          title: 'Experience',
          lines: [
            '20XX.XX - 20XX.XX · XXXX Group · XXXX Position',
            'Coordinated XXXX resources around XXXX goal and delivered XXXX.',
          ],
        },
        {
          title: 'Achievements',
          lines: ['Improved XXXX process and changed XXXX metric by XXXX.'],
        },
        {
          title: 'Education',
          lines: ['XXXX University · XXXX Major · Class of 20XX'],
        },
      ],
    },
    'product-results': {
      title: 'Product Results',
      description:
        'Single-column hierarchy for projects, metrics, and product thinking.',
      bestFor: 'Product, growth, operations, project management',
      previewSections: [
        'Contact',
        'Skills',
        'Projects',
        'Experience',
        'Metrics',
      ],
      sampleBlocks: [
        {
          title: 'Contact',
          lines: [
            'XXXX · Product / Growth direction',
            'Email XXXX · Phone XXXX',
          ],
        },
        {
          title: 'Skills',
          lines: ['Requirements · Data analysis · A/B testing · Growth · XXXX'],
        },
        {
          title: 'Projects',
          lines: [
            'XXXX Growth Project · 20XX.XX - 20XX.XX',
            'Located XXXX issue, designed XXXX path, and improved XXXX conversion by XXXX.',
          ],
        },
        {
          title: 'Experience',
          lines: [
            'XXXX Company · XXXX Product Manager',
            'Owned XXXX module and drove XXXX from 0 to 1.',
          ],
        },
        {
          title: 'Metrics',
          lines: ['XXXX metric +XXXX · XXXX user scale · XXXX revenue impact'],
        },
      ],
    },
    'technical-project': {
      title: 'Technical Project',
      description:
        'Highlights tech stack, project complexity, system contribution, and engineering outcomes.',
      bestFor: 'Engineering, AI, data, technical product roles',
      previewSections: [
        'Stack',
        'Projects',
        'Systems',
        'Experience',
        'Education',
      ],
      sampleBlocks: [
        {
          title: 'Stack',
          lines: ['XXXX / XXXX / XXXX / Database XXXX / Cloud XXXX'],
        },
        {
          title: 'Projects',
          lines: [
            'XXXX System Build · 20XX.XX - 20XX.XX',
            'Owned XXXX architecture and solved XXXX performance/stability issue.',
          ],
        },
        {
          title: 'Systems',
          lines: [
            'Reduced XXXX latency by XXXX and improved availability to XXXX.',
          ],
        },
        {
          title: 'Experience',
          lines: [
            'XXXX Company · XXXX Engineer',
            'Built XXXX platform and extracted XXXX component.',
          ],
        },
        {
          title: 'Education',
          lines: ['20XX - 20XX · XXXX University · XXXX Major'],
        },
      ],
    },
    'light-design': {
      title: 'Light Design',
      description:
        'Soft background blocks and stronger visual hierarchy for showcase-oriented profiles.',
      bestFor: 'Design, marketing, media, portfolio roles',
      previewSections: [
        'Contact',
        'Portfolio',
        'Highlights',
        'Skills',
        'Education',
      ],
      sampleBlocks: [
        {
          title: 'Contact',
          lines: ['XXXX · XXXX direction', 'Portfolio XXXX · Contact XXXX'],
        },
        {
          title: 'Skills',
          lines: [
            'Content planning · Visual expression · User insight · XXXX tools',
          ],
        },
        {
          title: 'Portfolio',
          lines: [
            'XXXX Work / Campaign · For XXXX audience',
            'Completed XXXX planning and execution, bringing XXXX exposure/conversion.',
          ],
        },
        {
          title: 'Highlights',
          lines: ['Owned XXXX theme from idea to launch and completed XXXX.'],
        },
        {
          title: 'Education',
          lines: ['XXXX School · XXXX Major · 20XX'],
        },
      ],
    },
  };

  return items.map((item) => ({
    ...item,
    title: copy[item.id]?.title ?? item.title,
    description: copy[item.id]?.description ?? item.description,
    bestFor: copy[item.id]?.bestFor ?? item.bestFor,
    previewSections: copy[item.id]?.previewSections ?? item.previewSections,
    sampleBlocks: copy[item.id]?.sampleBlocks ?? item.sampleBlocks,
  }));
}

function localizeVisualThemes(items: ResumeVisualTheme[], locale: 'zh' | 'en') {
  if (locale === 'zh') return items;

  const copy: Record<string, { title: string; description: string }> = {
    'clean-white': {
      title: 'Clean White',
      description:
        'Restrained and crisp, best for general applications and ATS readability.',
    },
    'business-blue': {
      title: 'Business Blue',
      description:
        'Trustworthy and polished for product, operations, business, and functional roles.',
    },
    'intelligent-gray': {
      title: 'Intelligent Gray',
      description:
        'A subtle AI-product feel for technical, data, and AI-related applications.',
    },
  };

  return items.map((item) => ({
    ...item,
    title: copy[item.id]?.title ?? item.title,
    description: copy[item.id]?.description ?? item.description,
  }));
}
