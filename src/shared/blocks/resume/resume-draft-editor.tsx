'use client';

import { Fragment, useEffect, useRef, useState } from 'react';
import {
  Clipboard,
  Download,
  Loader2,
  LockKeyhole,
  Printer,
} from 'lucide-react';
import { createPortal } from 'react-dom';

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
import { trackResumeEvent } from '@/shared/services/resume/analytics';
import { getResumeFillInFields } from '@/shared/services/resume/draft';
import { editorText } from '@/shared/services/resume/editor';
import { requestResumeDocx } from '@/shared/services/resume/export-client';
import {
  getResumeHeadingColor,
  getResumePageLayout,
} from '@/shared/services/resume/page-layout';
import type {
  ResumeEditorState,
  ResumeSlot,
} from '@/shared/services/resume/types';
import { getResumeVisualTheme } from '@/shared/services/resume/visual-templates';

const printStyles = `
[data-resume-print-root] { display: none; }
@media print {
  html, body { background: white !important; color: black !important; margin: 0 !important; padding: 0 !important; height: auto !important; }
  body:has(> [data-resume-print-root]) > :not([data-resume-print-root]) { display: none !important; }
  body > [data-resume-print-root] { display: block !important; position: static !important; width: 100% !important; margin: 0 !important; padding: 0 !important; background: white !important; color: black !important; box-shadow: none !important; }
  [data-resume-print-root] [data-resume-heading] { break-after: avoid; }
  [data-resume-print-root] p { orphans: 2; widows: 2; break-inside: avoid; }
}`;

function SlotTag({
  slot,
  onResolve,
  locale,
}: {
  slot: ResumeSlot;
  onResolve: (value: string, action: 'filled' | 'fallback') => void;
  locale: 'zh' | 'en';
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  const container = useRef<HTMLSpanElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const isZh = locale === 'zh';
  useEffect(() => {
    if (!open) return;
    input.current?.focus();
    function outside(event: PointerEvent) {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);
  return (
    <span
      ref={container}
      className="relative inline-block"
      onKeyDown={(event) => {
        if (event.key === 'Escape') setOpen(false);
      }}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        className="mx-0.5 rounded bg-amber-100 px-1.5 py-0.5 font-medium text-amber-950 underline decoration-dotted underline-offset-4"
        onClick={() => setOpen(!open)}
      >
        {isZh ? '待确认' : 'Confirm'}：{slot.label}
      </button>
      {open ? (
        <span
          role="dialog"
          aria-label={`${isZh ? '填写' : 'Fill'}：${slot.label}`}
          className="absolute top-full left-0 z-30 mt-2 inline-block w-72 max-w-[75vw] rounded-lg border bg-white p-3 text-left text-sm leading-6 text-slate-950 shadow-xl"
        >
          <label className="block font-medium">
            {slot.label}
            <input
              ref={input}
              value={value}
              maxLength={200}
              placeholder={slot.prompt}
              onChange={(event) => setValue(event.target.value)}
              onKeyDown={(event) => {
                if (
                  event.key === 'Enter' &&
                  !event.nativeEvent.isComposing &&
                  value.trim() &&
                  !/{{|}}|【待填写/.test(value)
                ) {
                  event.preventDefault();
                  onResolve(value, 'filled');
                }
              }}
              className="mt-2 block w-full rounded border px-2 py-1.5 font-normal"
            />
          </label>
          <span className="mt-1 block text-xs text-slate-600">
            {slot.prompt}
          </span>
          <span className="mt-3 flex gap-2">
            <Button
              size="sm"
              disabled={!value.trim() || /{{|}}|【待填写/.test(value)}
              onClick={() => onResolve(value, 'filled')}
            >
              {isZh ? '确认' : 'Confirm'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onResolve('', 'fallback')}
            >
              {isZh ? '暂无数据' : 'No data'}
            </Button>
          </span>
          <span className="mt-2 block text-xs text-slate-500">
            {isZh ? '暂无数据时：' : 'Without data: '}
            {slot.fallbackText ||
              (isZh ? '省略该可选信息' : 'omit this optional detail')}
          </span>
        </span>
      ) : null}
    </span>
  );
}

function ResumePreview({
  editor,
  locale,
  accent,
  onResolve,
  pageLayout,
  print = false,
}: {
  editor: ResumeEditorState;
  locale: 'zh' | 'en';
  accent: string;
  onResolve: (id: string, value: string, action: 'filled' | 'fallback') => void;
  pageLayout: ReturnType<typeof getResumePageLayout>;
  print?: boolean;
}) {
  const { profile } = pageLayout;
  return (
    <div
      style={{
        fontFamily: '"Microsoft YaHei", Arial, sans-serif',
        fontSize: `${profile.fontPt}pt`,
        lineHeight: `${profile.lineHeightPt}pt`,
        fontWeight: 400,
      }}
    >
      {pageLayout.lines.map(({ text: line, kind }, index) => {
        const first = kind === 'name';
        const heading = kind === 'section';
        const subheading = kind === 'subheading';
        const fontPt = first
          ? profile.titlePt
          : heading
            ? profile.sectionPt
            : subheading
              ? profile.subheadingPt
              : profile.fontPt;
        return (
          <p
            key={index}
            data-resume-heading={kind !== 'body' || undefined}
            data-resume-line-kind={kind}
            style={{
              margin: first
                ? `0 0 ${profile.titleAfterPt}pt`
                : heading
                  ? `${profile.sectionBeforePt}pt 0 ${profile.sectionAfterPt}pt`
                  : subheading
                    ? `${profile.subheadingBeforePt}pt 0 ${profile.subheadingAfterPt}pt`
                    : `0 0 ${profile.paragraphAfterPt}pt`,
              fontWeight: kind !== 'body' ? 700 : 400,
              fontSize: `${fontPt}pt`,
              lineHeight: `${kind !== 'body' ? fontPt * 1.3 : profile.lineHeightPt}pt`,
              textAlign: first ? 'center' : 'left',
              color: heading ? accent : '#111827',
              whiteSpace: 'pre-wrap',
              overflowWrap: 'anywhere',
            }}
          >
            {line.split(/({{[^{}\r\n]+}})/g).map((part, partIndex) => {
              const id = /^{{([^{}]+)}}$/.exec(part)?.[1];
              const slot = id
                ? editor.slots.find((candidate) => candidate.id === id)
                : undefined;
              return slot ? (
                <Fragment key={partIndex}>
                  {print ? (
                    slot.fallbackText
                  ) : (
                    <SlotTag
                      slot={slot}
                      locale={locale}
                      onResolve={(value, action) =>
                        onResolve(slot.id, value, action)
                      }
                    />
                  )}
                </Fragment>
              ) : (
                <Fragment key={partIndex}>{part}</Fragment>
              );
            })}
            {heading ? (
              <svg
                aria-hidden="true"
                data-resume-section-rule
                width="100%"
                height="1pt"
                viewBox="0 0 1 1"
                preserveAspectRatio="none"
                style={{ display: 'block', overflow: 'visible' }}
              >
                <rect width="1" height="1" fill={accent} />
              </svg>
            ) : null}
          </p>
        );
      })}
    </div>
  );
}

export function ResumeDraftEditor({
  editor,
  locale,
  title,
  templateId,
  layoutTemplateId,
  visualThemeId,
  busy,
  onEdit,
  onResolve,
  onRewrite,
}: {
  editor: ResumeEditorState;
  locale: 'zh' | 'en';
  title: string;
  templateId?: string;
  layoutTemplateId: string;
  visualThemeId: string;
  busy: boolean;
  onEdit: (id: string, text: string) => void;
  onResolve: (id: string, value: string, action: 'filled' | 'fallback') => void;
  onRewrite: (id: string, overrideLocked: boolean) => void;
}) {
  const isZh = locale === 'zh';
  const [mounted, setMounted] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const [confirmParagraph, setConfirmParagraph] = useState<string | null>(null);
  const exportController = useRef<AbortController | null>(null);
  const printStarted = useRef<number | null>(null);
  const draftText = editorText(editor);
  const pageLayout = getResumePageLayout(draftText, templateId);
  const { profile } = pageLayout;
  const pending = getResumeFillInFields(draftText).length;
  const accent = getResumeHeadingColor(
    getResumeVisualTheme(visualThemeId).accentColor
  );

  useEffect(() => {
    setMounted(true);
    const beforePrint = () => {
      if (printStarted.current !== null)
        trackResumeEvent('resume_file_exported', {
          locale,
          format: 'pdf',
          stage: 'print_dialog',
          duration_ms: Math.round(performance.now() - printStarted.current),
          save_confirmed: false,
        });
    };
    const afterPrint = () => {
      if (printStarted.current !== null)
        trackResumeEvent('resume_pdf_print_closed', {
          locale,
          format: 'pdf',
          duration_ms: Math.round(performance.now() - printStarted.current),
          save_confirmed: false,
        });
      printStarted.current = null;
    };
    window.addEventListener('beforeprint', beforePrint);
    window.addEventListener('afterprint', afterPrint);
    return () => {
      exportController.current?.abort();
      window.removeEventListener('beforeprint', beforePrint);
      window.removeEventListener('afterprint', afterPrint);
    };
  }, [locale]);

  async function copyResume() {
    setError('');
    try {
      await navigator.clipboard.writeText(draftText);
      trackResumeEvent('resume_copy_clicked', { locale });
    } catch {
      setError(
        isZh
          ? '复制失败，请检查剪贴板权限后重试。'
          : 'Copy failed. Check clipboard permissions.'
      );
    }
  }
  async function exportWord() {
    if (exportController.current) return;
    const controller = new AbortController();
    exportController.current = controller;
    const started = performance.now();
    setExporting(true);
    setError('');
    try {
      const { blob, durationMs: duration } = await requestResumeDocx(
        {
          title,
          rewrittenResume: draftText,
          templateId,
          layoutTemplateId,
          visualThemeId,
        },
        { signal: controller.signal, startedAt: started }
      );
      const url = URL.createObjectURL(blob);
      try {
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `${title.replace(/[\\/:*?"<>|]/g, '') || 'resume'}.docx`;
        document.body.append(anchor);
        anchor.click();
        anchor.remove();
      } finally {
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
      trackResumeEvent('resume_file_exported', {
        locale,
        format: 'docx',
        duration_ms: duration,
        stage: 'download_triggered',
        save_confirmed: false,
        layout: layoutTemplateId,
        theme: visualThemeId,
      });
    } catch (error) {
      setError(
        isZh
          ? '导出失败或网络拥堵，请重试；也可先复制纯文本保存。'
          : 'Export failed or timed out. Retry or copy the text to save your work.'
      );
      trackResumeEvent('resume_export_failed', {
        locale,
        format: 'docx',
        duration_ms: Math.round(performance.now() - started),
        outcome:
          error instanceof Error && error.name === 'AbortError'
            ? 'timeout_or_cancelled'
            : 'error',
      });
    } finally {
      exportController.current = null;
      setExporting(false);
    }
  }
  function printPdf() {
    setError('');
    printStarted.current = performance.now();
    try {
      window.print();
    } catch {
      printStarted.current = null;
      setError(
        isZh
          ? '无法打开打印窗口，请先复制文本或下载 Word。'
          : 'Printing is unavailable. Copy text or download Word instead.'
      );
    }
  }

  const displayParagraph = (text: string) =>
    editor.slots.reduce(
      (result, slot, index) =>
        result.replaceAll(
          `{{${slot.id}}}`,
          `【待确认 ${index + 1}：${slot.label}】`
        ),
      text
    );
  const rawParagraph = (text: string) =>
    editor.slots.reduce(
      (result, slot, index) =>
        result.replaceAll(
          `【待确认 ${index + 1}：${slot.label}】`,
          `{{${slot.id}}}`
        ),
      text
    );
  return (
    <div className="space-y-4">
      <style>
        {printStyles +
          `\n@media print { @page { size: A4; margin: ${profile.marginTopMm}mm ${profile.marginRightMm}mm ${profile.marginBottomMm}mm ${profile.marginLeftMm}mm; } }`}
      </style>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={!draftText.trim() || pending > 0}
          onClick={() => void copyResume()}
        >
          <Clipboard className="size-4" />
          {isZh ? '复制简历' : 'Copy resume'}
        </Button>
        <Button
          size="sm"
          disabled={exporting || !draftText.trim() || pending > 0}
          onClick={() => void exportWord()}
        >
          {exporting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Download className="size-4" />
          )}
          {exporting
            ? isZh
              ? '正在生成…'
              : 'Preparing…'
            : isZh
              ? '下载 DOCX'
              : 'Download DOCX'}
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={!draftText.trim() || pending > 0}
          onClick={printPdf}
        >
          <Printer className="size-4" />
          {isZh ? '打印 / 另存为 PDF' : 'Print / Save as PDF'}
        </Button>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      ) : null}
      {pending > 0 ? (
        <p role="status" className="text-sm text-amber-700 dark:text-amber-300">
          {isZh
            ? `还有 ${pending} 项待确认，请点击黄色标签填写，或选择“暂无数据”后再复制和导出。`
            : `${pending} fields need confirmation. Fill the yellow labels or choose No data before exporting.`}
        </p>
      ) : null}
      <p className="text-muted-foreground text-xs">
        {isZh
          ? '点击预览中的黄色标签补充真实数据。手动修改段落后会自动锁定，刷新和全局优化均会保留。'
          : 'Fill yellow labels with verified data. Manual edits lock each paragraph and survive refresh and global rewrites.'}
      </p>
      <div
        data-resume-preview
        data-resume-density={pageLayout.density}
        data-resume-estimated-lines={pageLayout.estimatedLines}
        className="rounded-lg border bg-white text-slate-950 shadow-sm"
        style={{
          width: '210mm',
          maxWidth: '100%',
          minHeight: '297mm',
          padding: `${profile.marginTopMm}mm ${profile.marginRightMm}mm ${profile.marginBottomMm}mm ${profile.marginLeftMm}mm`,
        }}
      >
        <ResumePreview
          editor={editor}
          locale={locale}
          accent={accent}
          onResolve={onResolve}
          pageLayout={pageLayout}
        />
      </div>
      <details open className="rounded-lg border p-3">
        <summary className="cursor-pointer text-sm font-semibold">
          {isZh
            ? '逐段编辑（手动修改自动锁定）'
            : 'Edit paragraphs (manual edits lock automatically)'}
        </summary>
        <div className="mt-4 space-y-3">
          {editor.paragraphs.map((paragraph, index) => (
            <div
              key={paragraph.id}
              className="rounded-md border p-3"
              data-paragraph-id={paragraph.id}
            >
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="flex items-center gap-1">
                  {isZh ? `段落 ${index + 1}` : `Paragraph ${index + 1}`} ·{' '}
                  {paragraph.state === 'User_Edited'
                    ? isZh
                      ? '用户手动编辑'
                      : 'User edited'
                    : paragraph.state === 'AI_Optimized'
                      ? isZh
                        ? 'AI 已优化'
                        : 'AI optimized'
                      : isZh
                        ? '原始状态'
                        : 'Original'}
                  {paragraph.isLocked ? (
                    <>
                      <LockKeyhole className="size-3" />
                      {isZh ? '已锁定' : 'Locked'}
                    </>
                  ) : null}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={busy || !paragraph.text.trim()}
                  onClick={() =>
                    paragraph.state === 'User_Edited'
                      ? setConfirmParagraph(paragraph.id)
                      : onRewrite(paragraph.id, false)
                  }
                >
                  {isZh ? '重新优化此段' : 'Rewrite paragraph'}
                </Button>
              </div>
              <Textarea
                aria-label={
                  isZh ? `编辑段落 ${index + 1}` : `Edit paragraph ${index + 1}`
                }
                value={displayParagraph(paragraph.text)}
                disabled={exporting}
                onKeyDown={(event) => {
                  if (
                    !event.ctrlKey &&
                    !event.metaKey &&
                    !event.altKey &&
                    (event.key.length === 1 ||
                      ['Backspace', 'Delete', 'Enter'].includes(event.key)) &&
                    paragraph.state !== 'User_Edited'
                  )
                    onEdit(paragraph.id, paragraph.text);
                }}
                onChange={(event) =>
                  onEdit(paragraph.id, rawParagraph(event.target.value))
                }
                className="min-h-16 resize-y bg-white text-sm dark:bg-zinc-950"
              />
            </div>
          ))}
        </div>
      </details>
      <Dialog
        open={confirmParagraph !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmParagraph(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isZh
                ? '此操作将覆盖您刚才的手动修改，是否继续？'
                : 'This will overwrite your manual edits. Continue?'}
            </DialogTitle>
            <DialogDescription>
              {isZh
                ? '只有本段会重新优化；请求失败或请求期间的新编辑仍会被保留。'
                : 'Only this paragraph will be rewritten. Failed requests and newer edits are preserved.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmParagraph(null)}>
              {isZh ? '取消' : 'Cancel'}
            </Button>
            <Button
              onClick={() => {
                const id = confirmParagraph;
                setConfirmParagraph(null);
                if (id) onRewrite(id, true);
              }}
            >
              {isZh ? '继续优化' : 'Continue'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {mounted
        ? createPortal(
            <div
              data-resume-print-root
              data-resume-density={pageLayout.density}
            >
              {pending > 0 ? (
                <p>
                  {isZh
                    ? '简历仍有待确认信息，请返回页面填写或选择暂无数据后再打印。'
                    : 'Resolve pending fields before printing this resume.'}
                </p>
              ) : (
                <ResumePreview
                  editor={editor}
                  locale={locale}
                  accent={accent}
                  onResolve={onResolve}
                  pageLayout={pageLayout}
                  print
                />
              )}
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
