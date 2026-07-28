'use client';

import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import {
  CheckCircle2,
  FileText,
  MousePointerClick,
  ScanSearch,
  Sparkles,
} from 'lucide-react';

export function ResumeDemoAnimation({
  locale = 'zh',
}: {
  locale?: 'zh' | 'en';
}) {
  const [score, setScore] = useState(88);

  useEffect(() => {
    const reduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;
    if (reduceMotion) {
      setScore(88);
      return;
    }

    let frame = 0;
    const interval = window.setInterval(() => {
      frame = (frame + 1) % 64;
      setScore(frame <= 26 ? 62 + frame : 88);
    }, 180);

    return () => window.clearInterval(interval);
  }, []);

  const copy =
    locale === 'en'
      ? {
          scan: 'Diagnosing',
          scanHint: 'Reading resume content',
          score: 'Match score',
          optimize: 'Start optimization',
          optimizing: 'Optimizing',
          final: 'Score',
          file: 'my-resume.pdf',
          section: 'Experience',
          old: 'Responsible for user growth campaigns',
          next: 'Led 3 growth campaigns, improving signup conversion by 18%',
        }
      : {
          scan: '诊断中',
          scanHint: '正在分析简历内容',
          score: '匹配分',
          optimize: '开始优化',
          optimizing: '优化中',
          final: '匹配分',
          file: '我的简历.pdf',
          section: '工作经历',
          old: '负责用户增长活动',
          next: '主导 3 场增长活动，注册转化率提升 18%',
        };

  return (
    <div className="relative overflow-hidden rounded-lg border bg-white/90 p-4 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur dark:bg-zinc-950/90">
      <style>{`
        @keyframes resumefit-scan {
          0%, 100% { transform: translateY(0); opacity: 0; }
          18%, 60% { opacity: 1; }
          72% { transform: translateY(84px); opacity: 0; }
        }
        @keyframes resumefit-click {
          0%, 28% { transform: translate(34px, 34px) scale(0.96); opacity: 0; }
          42%, 65% { transform: translate(0, 0) scale(1); opacity: 1; }
          78%, 100% { transform: translate(0, 0) scale(0.92); opacity: 0; }
        }
        @keyframes resumefit-strike {
          0%, 44% { transform: scaleX(0); }
          60%, 100% { transform: scaleX(1); }
        }
        @keyframes resumefit-reveal {
          0%, 48% { opacity: 0; transform: translateY(8px); }
          64%, 100% { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .resumefit-animated {
            animation: none !important;
            transform: none !important;
            opacity: 1 !important;
          }
        }
      `}</style>

      <div className="grid gap-3">
        <DemoRow step="1" title={copy.scan} tone="blue">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
            <ResumeMiniCard copy={copy} scan />
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              <ScanSearch className="size-4 text-blue-600" />
              {copy.scanHint}
            </div>
          </div>
        </DemoRow>

        <DemoRow step="2" title={`${copy.score} 62`} tone="amber">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
            <ResumeMiniCard copy={copy} />
            <ScoreCircle score={62} tone="amber" label={copy.score} />
          </div>
        </DemoRow>

        <DemoRow step="3" title={copy.optimize} tone="blue">
          <div className="relative grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
            <div className="rounded-md border bg-white p-4 shadow-sm dark:bg-zinc-900">
              <div className="mb-3 flex items-center gap-2 text-xs text-slate-500">
                <FileText className="size-4 text-blue-600" />
                {copy.file}
              </div>
              <button className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-blue-600 px-5 text-sm font-medium text-white shadow-sm">
                <Sparkles className="size-4" />
                {copy.optimize}
              </button>
            </div>
            <ScoreCircle score={74} tone="blue" label={copy.optimizing} />
            <MousePointerClick className="resumefit-animated pointer-events-none absolute right-20 bottom-8 size-9 animate-[resumefit-click_8s_ease-in-out_infinite] fill-white text-slate-950 drop-shadow-md dark:fill-zinc-950 dark:text-white" />
          </div>
        </DemoRow>

        <DemoRow step="4" title={`${copy.final} ${score}`} tone="green">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
            <div className="rounded-md border bg-white p-4 shadow-sm dark:bg-zinc-900">
              <div className="mb-3 flex items-center gap-2 text-xs text-green-700 dark:text-green-400">
                <CheckCircle2 className="size-4" />
                {locale === 'en' ? 'optimized-resume.pdf' : '我的简历_优化版.pdf'}
              </div>
              <p className="relative w-fit text-sm text-slate-500 line-through decoration-slate-500 decoration-2">
                {copy.old}
              </p>
              <p className="mt-3 flex items-start gap-2 text-sm font-medium text-green-700 dark:text-green-400">
                <span className="mt-1 size-1.5 rounded-full bg-green-600" />
                {copy.next}
              </p>
            </div>
            <ScoreCircle score={score} tone="green" label={copy.final} />
          </div>
        </DemoRow>
      </div>
    </div>
  );
}

function DemoRow({
  step,
  title,
  tone,
  children,
}: {
  step: string;
  title: string;
  tone: 'blue' | 'amber' | 'green';
  children: ReactNode;
}) {
  const toneClass = {
    blue: 'bg-blue-600 text-white',
    amber: 'bg-amber-500 text-white',
    green: 'bg-green-600 text-white',
  }[tone];

  return (
    <div className="grid gap-3 border-b pb-3 last:border-b-0 last:pb-0 sm:grid-cols-[9rem_1fr]">
      <div className="flex items-center gap-3">
        <span
          className={`flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${toneClass}`}
        >
          {step}
        </span>
        <span className="text-sm font-semibold">{title}</span>
      </div>
      {children}
    </div>
  );
}

function ResumeMiniCard({
  copy,
  scan = false,
}: {
  copy: { file: string; section: string };
  scan?: boolean;
}) {
  return (
    <div className="relative overflow-hidden rounded-md border bg-white p-4 shadow-sm dark:bg-zinc-900">
      {scan ? (
        <span className="resumefit-animated absolute inset-x-3 top-8 h-0.5 animate-[resumefit-scan_8s_ease-in-out_infinite] bg-blue-500 shadow-[0_0_18px_rgba(37,99,235,0.8)]" />
      ) : null}
      <div className="mb-3 flex items-center gap-2 text-xs text-slate-500">
        <FileText className="size-4 text-blue-600" />
        {copy.file}
      </div>
      <div className="mb-2 text-xs font-medium">{copy.section}</div>
      <div className="space-y-2">
        <div className="h-1.5 w-4/5 rounded-full bg-slate-200 dark:bg-slate-700" />
        <div className="h-1.5 w-2/3 rounded-full bg-slate-200 dark:bg-slate-700" />
        <div className="h-1.5 w-5/6 rounded-full bg-slate-200 dark:bg-slate-700" />
        <div className="h-1.5 w-3/5 rounded-full bg-slate-200 dark:bg-slate-700" />
      </div>
    </div>
  );
}

function ScoreCircle({
  score,
  tone,
  label,
}: {
  score: number;
  tone: 'blue' | 'amber' | 'green';
  label: string;
}) {
  const color = {
    blue: 'border-blue-500 text-blue-600',
    amber: 'border-amber-500 text-amber-600',
    green: 'border-green-500 text-green-600',
  }[tone];

  return (
    <div
      className={`flex size-24 shrink-0 flex-col items-center justify-center rounded-full border-[6px] ${color}`}
    >
      <span className="text-3xl font-semibold tabular-nums">{score}</span>
      <span className="text-xs text-slate-500 dark:text-slate-400">
        {label}
      </span>
    </div>
  );
}
