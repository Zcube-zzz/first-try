'use client';

import { useEffect, useRef, useState, type ChangeEvent } from 'react';

import { useRouter } from '@/core/i18n/navigation';
import { trackResumeEvent } from '@/shared/services/resume/analytics';
import { RESUME_TEST_DEMO } from '@/shared/services/resume/demo';
import {
  createResumeEditor,
  editorText,
  editResumeParagraph,
  isResumeEditor,
  mergeResumeRewrites,
  referencedSlots,
  resetUnlockedParagraphs,
  resolveResumeSlot,
} from '@/shared/services/resume/editor';
import { inspectResumeText } from '@/shared/services/resume/quality';
import { getResumeTemplate } from '@/shared/services/resume/templates';
import type {
  ResumeDiagnosis,
  ResumeEditorState,
  ResumeExtractionResult,
  ResumeOptimizationResult,
} from '@/shared/services/resume/types';

const storageKey = 'resumefit.workflow.v1';
type Busy = 'parse' | 'diagnose' | 'optimize' | null;

export function useResumeWorkflow(
  locale: 'zh' | 'en',
  initialStep: 'upload' | 'diagnose' | 'optimize'
) {
  const router = useRouter();
  const defaultScenario = getResumeTemplate('product-manager');
  const [resumeText, setResumeText] = useState('');
  const [fileName, setFileName] = useState('');
  const [extractionConfidence, setExtractionConfidence] = useState<
    number | null
  >(null);
  const [targetRole, setTargetRole] = useState('');
  const [jdText, setJdText] = useState('');
  const [templateId, setTemplateId] = useState(defaultScenario.id);
  const [styleId, setStyleId] = useState(defaultScenario.recommendedStyleId);
  const [layoutTemplateId, setLayoutTemplateId] = useState(
    defaultScenario.recommendedLayoutId
  );
  const [visualThemeId, setVisualThemeId] = useState(
    defaultScenario.recommendedVisualThemeId
  );
  const [warnings, setWarnings] = useState<string[]>([]);
  const [diagnosis, setDiagnosis] = useState<ResumeDiagnosis | null>(null);
  const [optimization, setOptimization] =
    useState<ResumeOptimizationResult | null>(null);
  const [editor, setEditorState] = useState<ResumeEditorState>(
    createResumeEditor('')
  );
  const editorRef = useRef(editor);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [storageError, setStorageError] = useState('');
  const [busy, setBusy] = useState<Busy>(null);
  const [hydrated, setHydrated] = useState(false);
  const [parseBlocked, setParseBlocked] = useState(false);
  const [qualityDialogOpen, setQualityDialogOpen] = useState(false);
  const wordInputRef = useRef<HTMLInputElement>(null);
  const requestRef = useRef<AbortController | null>(null);
  const requestEpoch = useRef(0);
  const text = (zh: string, en: string) => (locale === 'zh' ? zh : en);

  function setEditor(next: ResumeEditorState) {
    editorRef.current = next;
    setEditorState(next);
  }

  useEffect(() => {
    try {
      const saved = window.sessionStorage.getItem(storageKey);
      if (saved) {
        const value = JSON.parse(saved);
        const scenario = getResumeTemplate(
          value.templateId ?? defaultScenario.id
        );
        setResumeText(
          typeof value.resumeText === 'string' ? value.resumeText : ''
        );
        setFileName(typeof value.fileName === 'string' ? value.fileName : '');
        setExtractionConfidence(
          typeof value.extractionConfidence === 'number'
            ? value.extractionConfidence
            : null
        );
        setTargetRole(
          typeof value.targetRole === 'string' ? value.targetRole : ''
        );
        setJdText(typeof value.jdText === 'string' ? value.jdText : '');
        setTemplateId(scenario.id);
        setStyleId(value.styleId ?? scenario.recommendedStyleId);
        setLayoutTemplateId(
          value.layoutTemplateId ?? scenario.recommendedLayoutId
        );
        setVisualThemeId(
          value.visualThemeId ?? scenario.recommendedVisualThemeId
        );
        setWarnings(
          Array.isArray(value.warnings)
            ? value.warnings.filter(
                (warning: unknown) => typeof warning === 'string'
              )
            : []
        );
        setDiagnosis(value.diagnosis ?? null);
        setParseBlocked(value.parseBlocked === true);
        if (isResumeEditor(value.editor)) {
          setEditor(value.editor);
          setOptimization(value.optimization ?? null);
        } else setEditor(createResumeEditor(value.resumeText ?? ''));
      }
    } catch {
      setStorageError(
        text(
          '会话草稿无法恢复，请重新粘贴简历。',
          'Could not restore this tab’s draft. Paste your resume again.'
        )
      );
    }
    setHydrated(true);
    return () => {
      requestRef.current?.abort();
    };
  }, []);

  function persist(overrides: Record<string, unknown> = {}) {
    try {
      window.sessionStorage.setItem(
        storageKey,
        JSON.stringify({
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
          editor: editorRef.current,
          parseBlocked,
          ...overrides,
        })
      );
      setStorageError('');
    } catch {
      setStorageError(
        text(
          '浏览器未能暂存草稿，请先复制内容，避免刷新后丢失修改。',
          'Draft storage is unavailable. Copy your draft before refreshing.'
        )
      );
    }
  }

  useEffect(() => {
    if (hydrated) persist();
  }, [
    hydrated,
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
    editor,
    parseBlocked,
  ]);

  function cancelWork() {
    requestEpoch.current += 1;
    requestRef.current?.abort();
    requestRef.current = null;
    setBusy(null);
    setError('');
  }

  function invalidateContext() {
    cancelWork();
    setDiagnosis(null);
    setOptimization(null);
    setEditor(resetUnlockedParagraphs(editorRef.current));
    const count = editorRef.current.paragraphs.filter(
      (paragraph) => paragraph.isLocked
    ).length;
    setNotice(
      count
        ? text(
            `方向已调整，已为您保留 ${count} 处手动修改的段落。`,
            `Settings changed. Preserved ${count} manually edited paragraphs.`
          )
        : ''
    );
  }

  function updateResumeText(value: string) {
    cancelWork();
    setResumeText(value);
    setFileName('');
    setExtractionConfidence(null);
    setDiagnosis(null);
    setOptimization(null);
    setWarnings([]);
    setParseBlocked(false);
    setEditor(createResumeEditor(value));
    setNotice('');
  }
  function updateTargetRole(value: string) {
    invalidateContext();
    setTargetRole(value);
  }
  function updateJdText(value: string) {
    invalidateContext();
    setJdText(value);
  }
  function updateTemplate(value: string) {
    invalidateContext();
    setTemplateId(value);
  }
  function updateStyle(value: string) {
    invalidateContext();
    setStyleId(value);
  }
  function updateLayoutTemplate(value: string) {
    invalidateContext();
    setLayoutTemplateId(value);
  }
  function updateVisualTheme(value: string) {
    invalidateContext();
    setVisualThemeId(value);
  }

  function fillDemo() {
    cancelWork();
    const scenario = getResumeTemplate(RESUME_TEST_DEMO.templateId);
    setResumeText(RESUME_TEST_DEMO.resumeText);
    setTargetRole(RESUME_TEST_DEMO.targetRole);
    setJdText(RESUME_TEST_DEMO.jdText);
    setTemplateId(scenario.id);
    setStyleId(scenario.recommendedStyleId);
    setLayoutTemplateId(scenario.recommendedLayoutId);
    setVisualThemeId(scenario.recommendedVisualThemeId);
    setFileName('');
    setExtractionConfidence(null);
    setWarnings([]);
    setParseBlocked(false);
    setQualityDialogOpen(false);
    setDiagnosis(null);
    setOptimization(null);
    setEditor(createResumeEditor(RESUME_TEST_DEMO.resumeText));
    setNotice(
      text(
        '已填入完全虚构的测试资料，未调用上传或解析接口。',
        'Fictional demo inserted locally. No upload or parsing request was made.'
      )
    );
    persist({
      ...RESUME_TEST_DEMO,
      fileName: '',
      extractionConfidence: null,
      templateId: scenario.id,
      styleId: scenario.recommendedStyleId,
      layoutTemplateId: scenario.recommendedLayoutId,
      visualThemeId: scenario.recommendedVisualThemeId,
      warnings: [],
      parseBlocked: false,
      diagnosis: null,
      optimization: null,
    });
    if (initialStep === 'upload') router.push('/resume/diagnose');
  }

  function begin(kind: Exclude<Busy, null>) {
    if (requestRef.current) return null;
    const controller = new AbortController();
    requestRef.current = controller;
    const epoch = ++requestEpoch.current;
    setBusy(kind);
    setError('');
    return { controller, epoch, started: performance.now() };
  }
  function finish(epoch: number) {
    if (requestEpoch.current !== epoch) return;
    requestRef.current = null;
    setBusy(null);
  }
  async function request<T>(
    url: string,
    body: BodyInit,
    controller: AbortController,
    json = true
  ): Promise<T> {
    const timer = window.setTimeout(() => controller.abort(), 90000);
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: json ? { 'Content-Type': 'application/json' } : undefined,
        body,
        signal: controller.signal,
      });
      const payload = await response.json();
      if (!response.ok || payload.code !== 0)
        throw new Error(
          payload.message ||
            text('请求失败，请重试。', 'Request failed. Please retry.')
        );
      return payload.data;
    } finally {
      window.clearTimeout(timer);
    }
  }

  async function parseFile(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    cancelWork();
    const operation = begin('parse')!;
    setWarnings([]);
    setDiagnosis(null);
    setOptimization(null);
    setFileName(file.name);
    setExtractionConfidence(null);
    setResumeText('');
    setEditor(createResumeEditor(''));
    setParseBlocked(false);
    const format = file.name.toLowerCase().endsWith('.pdf')
      ? 'pdf'
      : file.name.toLowerCase().endsWith('.docx')
        ? 'docx'
        : 'text';
    try {
      const form = new FormData();
      form.append('file', file);
      const result = await request<ResumeExtractionResult>(
        '/api/resume/parse',
        form,
        operation.controller,
        false
      );
      if (operation.epoch !== requestEpoch.current) return;
      const quality = inspectResumeText(result.text);
      setResumeText(result.text);
      setEditor(createResumeEditor(result.text));
      setFileName(result.fileName ?? file.name);
      setExtractionConfidence(result.confidence);
      setWarnings(result.warnings);
      setParseBlocked(quality.isLowQuality);
      setQualityDialogOpen(quality.isLowQuality);
      trackResumeEvent('resume_parse_completed', {
        locale,
        format,
        duration_ms: Math.round(performance.now() - operation.started),
        degraded: quality.isLowQuality,
        outcome: 'success',
      });
      if (!quality.isLowQuality && initialStep === 'upload') {
        persist({
          resumeText: result.text,
          fileName: result.fileName ?? file.name,
          extractionConfidence: result.confidence,
          warnings: result.warnings,
          parseBlocked: false,
          diagnosis: null,
          optimization: null,
        });
        router.push('/resume/diagnose');
      }
    } catch (err) {
      if (operation.epoch !== requestEpoch.current) return;
      setError(
        operation.controller.signal.aborted
          ? text(
              '解析耗时过长，请改为粘贴文本或上传 Word。',
              'Parsing timed out. Paste text or upload Word instead.'
            )
          : err instanceof Error
            ? err.message
            : text('解析失败，请重试。', 'Parsing failed. Please retry.')
      );
      trackResumeEvent('resume_parse_completed', {
        locale,
        format,
        duration_ms: Math.round(performance.now() - operation.started),
        degraded: false,
        outcome: 'error',
      });
    } finally {
      input.value = '';
      finish(operation.epoch);
    }
  }

  function continueToDiagnosis() {
    if (parseBlocked) {
      setQualityDialogOpen(true);
      return;
    }
    if (resumeText.trim()) {
      persist();
      router.push('/resume/diagnose');
    }
  }
  function chooseManualPaste() {
    updateResumeText('');
    setQualityDialogOpen(false);
    window.setTimeout(
      () =>
        document
          .querySelector<HTMLTextAreaElement>('[data-resume-input]')
          ?.focus(),
      0
    );
  }
  function requestWordUpload() {
    setQualityDialogOpen(false);
    wordInputRef.current?.click();
  }
  function forceContinue() {
    if (!resumeText.trim()) {
      setError(
        text(
          '没有提取到文字，请手动粘贴文本或重新上传 Word。',
          'No text was extracted. Paste text or upload Word.'
        )
      );
      return;
    }
    setParseBlocked(false);
    setQualityDialogOpen(false);
    persist({ parseBlocked: false });
    if (initialStep === 'upload') router.push('/resume/diagnose');
  }

  const hasResume = resumeText.trim().length > 0;
  const hasTarget = targetRole.trim().length > 0 || jdText.trim().length > 0;
  const canDiagnose = hydrated && hasResume && hasTarget && !parseBlocked;

  async function runDiagnosis() {
    if (!canDiagnose) return;
    const operation = begin('diagnose');
    if (!operation) return;
    setDiagnosis(null);
    try {
      const result = await request<ResumeDiagnosis>(
        '/api/resume/diagnose',
        JSON.stringify({
          resumeText,
          targetRole,
          jdText,
          templateId,
          styleId,
          locale,
        }),
        operation.controller
      );
      if (operation.epoch !== requestEpoch.current) return;
      setDiagnosis(result);
      trackResumeEvent('resume_diagnosis_completed', {
        locale,
        scoreBand:
          result.score < 60 ? 'low' : result.score < 80 ? 'medium' : 'high',
      });
    } catch (err) {
      if (operation.epoch === requestEpoch.current)
        setError(
          operation.controller.signal.aborted
            ? text('诊断超时，请重试。', 'Diagnosis timed out. Please retry.')
            : err instanceof Error
              ? err.message
              : 'Request failed'
        );
    } finally {
      finish(operation.epoch);
    }
  }

  async function runOptimization(paragraphId?: string, overrideLocked = false) {
    if (!canDiagnose) return;
    const current = editorRef.current;
    const snapshot = current.paragraphs
      .filter((paragraph) =>
        paragraphId
          ? paragraph.id === paragraphId &&
            (!paragraph.isLocked || overrideLocked)
          : !paragraph.isLocked
      )
      .filter((paragraph) => paragraph.text.trim())
      .map((paragraph) => ({ ...paragraph }));
    const lockedCount = current.paragraphs.filter(
      (paragraph) => paragraph.isLocked
    ).length;
    if (!snapshot.length) {
      setNotice(
        text(
          `已为您保留 ${lockedCount} 处手动修改的段落，没有可重新优化的未锁定内容。`,
          `Preserved ${lockedCount} edited paragraphs. No unlocked content to rewrite.`
        )
      );
      return;
    }
    const operation = begin('optimize');
    if (!operation) return;
    const scope = paragraphId ? 'paragraph' : 'global';
    const source = snapshot.map((paragraph) => paragraph.text).join('\n');
    try {
      const result = await request<ResumeOptimizationResult>(
        '/api/resume/optimize',
        JSON.stringify({
          resumeText: source,
          draftTitle: optimization?.title || targetRole || 'resume',
          rewriteScope: paragraphId
            ? 'paragraph'
            : snapshot.length === current.paragraphs.length
              ? 'full'
              : 'unlocked',
          paragraphs: snapshot.map(({ id, text }) => ({ id, text })),
          slots: referencedSlots(source, current.slots),
          targetRole,
          jdText,
          templateId,
          styleId,
          layoutTemplateId,
          visualThemeId,
          locale,
        }),
        operation.controller
      );
      if (operation.epoch !== requestEpoch.current) return;
      const next =
        result.generationStatus === 'success'
          ? mergeResumeRewrites(
              editorRef.current,
              snapshot,
              result.paragraphs,
              result.slots,
              overrideLocked
            )
          : editorRef.current;
      setEditor(next);
      setOptimization({
        ...result,
        rewrittenResume: editorText(next),
        paragraphs: next.paragraphs.map(({ id, text }) => ({ id, text })),
        slots: next.slots,
      });
      if (snapshot.length === current.paragraphs.length && !paragraphId)
        setDiagnosis(result.diagnosis);
      const preserved = next.paragraphs.filter(
        (paragraph) => paragraph.isLocked
      ).length;
      setNotice(
        (result.generationStatus === 'success'
          ? text(
              '已更新未锁定且未被继续编辑的段落。',
              'Updated eligible unchanged paragraphs. '
            )
          : text(
              '本次 AI 未生成可靠改写，已保留现有内容。',
              'AI did not return a reliable rewrite. Existing content was preserved. '
            )) +
          (preserved
            ? text(
                `已为您保留 ${preserved} 处手动修改的段落。`,
                `Preserved ${preserved} manually edited paragraphs.`
              )
            : '')
      );
      trackResumeEvent(
        result.generationStatus === 'success'
          ? 'resume_optimization_completed'
          : 'resume_optimization_failed',
        {
          locale,
          scenario: templateId,
          layout: layoutTemplateId,
          theme: visualThemeId,
          slot_count: result.slots.length,
          duration_ms: Math.round(performance.now() - operation.started),
          scope,
          outcome: result.generationStatus,
        }
      );
    } catch (err) {
      if (operation.epoch !== requestEpoch.current) return;
      setError(
        operation.controller.signal.aborted
          ? text(
              '优化超时，手动修改已保留，请稍后重试。',
              'Optimization timed out. Manual edits were preserved.'
            )
          : err instanceof Error
            ? err.message
            : 'Request failed'
      );
      trackResumeEvent('resume_optimization_failed', {
        locale,
        scenario: templateId,
        scope,
        duration_ms: Math.round(performance.now() - operation.started),
        outcome: 'error',
      });
    } finally {
      finish(operation.epoch);
    }
  }

  function onParagraphEdit(id: string, value: string) {
    const previous = editorRef.current.paragraphs.find(
      (paragraph) => paragraph.id === id
    );
    if (!previous) return;
    if (previous.state === 'AI_Optimized')
      trackResumeEvent('resume_paragraph_edited', {
        locale,
        paragraph_id: id,
        paragraph_index: editorRef.current.paragraphs.indexOf(previous) + 1,
      });
    setEditor(editResumeParagraph(editorRef.current, id, value));
  }
  function onSlotResolve(
    id: string,
    value: string,
    action: 'filled' | 'fallback'
  ) {
    const slot = editorRef.current.slots.find(
      (candidate) => candidate.id === id
    );
    if (!slot) return;
    const replacement =
      action === 'fallback' ? slot.fallbackText : value.trim();
    if (
      (action === 'filled' && !replacement) ||
      /{{|}}|【待填写/.test(replacement)
    )
      return;
    for (const paragraph of editorRef.current.paragraphs) {
      if (
        paragraph.text.includes(`{{${id}}}`) &&
        paragraph.state === 'AI_Optimized'
      )
        trackResumeEvent('resume_paragraph_edited', {
          locale,
          paragraph_id: paragraph.id,
          paragraph_index: editorRef.current.paragraphs.indexOf(paragraph) + 1,
        });
    }
    setEditor(resolveResumeSlot(editorRef.current, id, replacement));
    trackResumeEvent('resume_slot_resolved', { locale, slot_id: id, action });
  }

  return {
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
    editor,
    error,
    notice,
    storageError,
    busy,
    hasResume,
    canDiagnose,
    canOptimize: canDiagnose,
    parseBlocked,
    qualityDialogOpen,
    setQualityDialogOpen,
    wordInputRef,
    chooseManualPaste,
    requestWordUpload,
    forceContinue,
    continueToDiagnosis,
    fillDemo,
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
    onParagraphEdit,
    onSlotResolve,
  };
}
