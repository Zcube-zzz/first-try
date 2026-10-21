'use client';

import { ChangeEvent, DragEvent, useRef, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  FileText,
  LoaderCircle,
  Sparkles,
  UploadCloud,
} from 'lucide-react';

import { useRouter } from '@/core/i18n/navigation';
import { ResumeDemoAnimation } from '@/shared/blocks/resume';
import { Button } from '@/shared/components/ui/button';
import { cn } from '@/shared/lib/utils';
import type { ResumeExtractionResult } from '@/shared/services/resume/types';
import { Section } from '@/shared/types/blocks/landing';

const storageKey = 'resumefit.workflow.v1';
const maxFileSize = 10 * 1024 * 1024;

export function ResumeHero({
  section,
  className,
}: {
  section: Section;
  className?: string;
}) {
  const locale = section.locale === 'en' ? 'en' : 'zh';
  const isEnglish = locale === 'en';
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fileName, setFileName] = useState('');

  async function upload(file?: File) {
    if (!file) return;
    setError('');
    setFileName(file.name);

    if (file.size > maxFileSize) {
      setError(isEnglish ? 'Maximum file size is 10MB.' : '文件不能超过 10MB。');
      return;
    }

    setBusy(true);
    try {
      const body = new FormData();
      body.append('file', file);
      const response = await fetch('/api/resume/parse', {
        method: 'POST',
        body,
      });
      const payload = (await response.json()) as {
        code: number;
        message: string;
        data: ResumeExtractionResult;
      };
      if (!response.ok || payload.code !== 0) {
        throw new Error(payload.message || 'Resume parse failed');
      }
      if (!payload.data.text?.trim()) {
        throw new Error(isEnglish ? 'No readable text found.' : '没有识别到可用的简历文字。');
      }

      sessionStorage.setItem(
        storageKey,
        JSON.stringify({
          resumeText: payload.data.text,
          fileName: payload.data.fileName || file.name,
          extractionConfidence: payload.data.confidence,
          warnings: payload.data.warnings,
        })
      );
      router.push('/resume/diagnose');
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : '';
      setError(
        isEnglish
          ? message || 'Could not read this file. Please try again.'
          : /unsupported resume file type/i.test(message)
            ? '暂不支持此文件类型，请使用 PDF、DOCX 或文本文件。'
            : /too large|maximum size/i.test(message)
              ? '文件不能超过 10MB。'
              : '简历读取失败，请重试或粘贴简历文字。'
      );
      setBusy(false);
    }
  }

  function onInputChange(event: ChangeEvent<HTMLInputElement>) {
    void upload(event.target.files?.[0]);
    event.target.value = '';
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    void upload(event.dataTransfer.files[0]);
  }

  const uploadCopy = section.optimizer_copy ?? {};

  return (
    <section
      id={section.id}
      className={cn(
        'relative isolate overflow-hidden bg-[#080d19] pt-28 pb-24 text-white md:pt-36 md:pb-28',
        section.className,
        className
      )}
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff16_1px,transparent_1px)] [background-size:26px_26px] opacity-25 [mask-image:linear-gradient(to_bottom,black,transparent_90%)]" />
        <div className="absolute -top-56 left-[12%] size-[38rem] rounded-full bg-blue-600/25 blur-[120px]" />
        <div className="absolute top-20 -right-40 size-[34rem] rounded-full bg-cyan-400/15 blur-[130px]" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#080d19] to-transparent" />
      </div>

      <div className="container relative">
        <div className="grid min-w-0 items-center gap-14 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-12">
          <div className="relative z-10 max-w-xl">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-3.5 py-2 text-sm text-blue-100 shadow-[0_0_32px_rgba(59,130,246,0.12)] backdrop-blur">
              <Sparkles className="size-4 text-cyan-300" />
              <span>{section.label}</span>
            </div>

            <h1 className="max-w-2xl text-5xl leading-[1.08] font-semibold text-balance sm:text-6xl lg:text-[4.25rem]">
              {section.title}
              {section.subtitle ? (
                <span className="mt-3 block bg-gradient-to-r from-cyan-300 via-blue-300 to-violet-300 bg-clip-text text-4xl text-transparent sm:text-5xl lg:text-6xl">
                  {section.subtitle}
                </span>
              ) : null}
            </h1>

            <p className="mt-6 max-w-lg text-base leading-7 text-slate-300 sm:text-lg">
              {section.description}
            </p>

            <div
              onDragEnter={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragOver={(event) => event.preventDefault()}
              onDragLeave={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node)) {
                  setDragging(false);
                }
              }}
              onDrop={onDrop}
              className={cn(
                'mt-8 rounded-xl border border-white/15 bg-white/[0.06] p-2 shadow-[0_24px_80px_rgba(0,0,0,0.26)] backdrop-blur-xl transition-colors',
                dragging && 'border-cyan-300 bg-cyan-300/10'
              )}
            >
              <input
                ref={inputRef}
                type="file"
                accept=".pdf,.docx,.txt,.md"
                onChange={onInputChange}
                className="sr-only"
                aria-label={isEnglish ? 'Upload your resume' : '上传简历'}
              />
              <div className="flex flex-col gap-3 rounded-lg border border-dashed border-white/20 px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 text-white shadow-lg shadow-blue-500/25">
                    {busy ? (
                      <LoaderCircle className="size-5 animate-spin" />
                    ) : fileName ? (
                      <FileText className="size-5" />
                    ) : (
                      <UploadCloud className="size-5" />
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-white">
                      {busy
                        ? isEnglish
                          ? 'Reading your resume…'
                          : '正在读取简历…'
                        : fileName ||
                          uploadCopy.uploadTitle ||
                          (isEnglish ? 'Upload your resume' : '上传你的简历')}
                    </span>
                    <span className="mt-1 block text-xs text-slate-400">
                      {uploadCopy.uploadHint ||
                        (isEnglish
                          ? 'PDF, DOCX or text · up to 10MB'
                          : 'PDF、DOCX 或文本 · 最大 10MB')}
                    </span>
                  </span>
                </div>
                <Button
                  type="button"
                  disabled={busy}
                  onClick={() => inputRef.current?.click()}
                  className="h-11 shrink-0 bg-white px-5 font-semibold text-slate-950 hover:bg-cyan-50"
                >
                  {busy
                    ? isEnglish
                      ? 'Reading'
                      : '识别中'
                    : isEnglish
                      ? 'Choose file'
                      : '选择文件'}
                  {!busy && <ArrowRight className="size-4" />}
                </Button>
              </div>
              {error ? (
                <p role="alert" className="px-4 pt-3 pb-2 text-sm text-rose-300">
                  {error}
                </p>
              ) : null}
            </div>

            <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
              <CheckCircle2 className="size-4 text-emerald-300" />
              {isEnglish
                ? 'Resume text stays in this browser session; AI analysis sends it to the configured model provider. Avoid sensitive details.'
                : '简历文本暂存于当前浏览器会话；AI 诊断或优化时会发送至所配置的模型服务处理，请勿上传敏感信息。'}
            </div>
          </div>

          <div className="relative min-w-0">
            <div aria-hidden className="absolute -inset-6 rounded-[2rem] bg-gradient-to-br from-blue-500/20 via-cyan-400/10 to-violet-500/20 blur-2xl" />
            <div className="relative rotate-0 transition-transform duration-700 ease-out lg:rotate-[1.25deg] lg:hover:rotate-0">
              <ResumeDemoAnimation locale={locale} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
