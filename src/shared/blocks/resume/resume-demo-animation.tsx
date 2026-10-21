'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Check,
  FileText,
  MousePointerClick,
  ScanSearch,
  Sparkles,
} from 'lucide-react';

import { cn } from '@/shared/lib/utils';

type DemoStage = 'diagnose' | 'score' | 'confirm' | 'optimize';

const stages: DemoStage[] = ['diagnose', 'score', 'confirm', 'optimize'];

export function ResumeDemoAnimation({
  locale = 'zh',
}: {
  locale?: 'zh' | 'en';
}) {
  const [stageIndex, setStageIndex] = useState(0);
  const [score, setScore] = useState(62);
  const stage = stages[stageIndex];
  const copy = getDemoCopy(locale);

  useEffect(() => {
    const reduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;
    if (reduceMotion) {
      setStageIndex(3);
      setScore(88);
      return;
    }

    const interval = window.setInterval(() => {
      setStageIndex((current) => (current + 1) % stages.length);
    }, 2200);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (stage !== 'optimize') {
      setScore(stage === 'diagnose' ? 0 : 62);
      return;
    }

    let nextScore = 62;
    const interval = window.setInterval(() => {
      nextScore = Math.min(88, nextScore + 2);
      setScore(nextScore);
      if (nextScore >= 88) {
        window.clearInterval(interval);
      }
    }, 120);

    return () => window.clearInterval(interval);
  }, [stage]);

  const progress = useMemo(() => {
    if (stage === 'diagnose') return 28;
    if (stage === 'score') return 62;
    if (stage === 'confirm') return 66;
    return score;
  }, [score, stage]);
  const displayScore =
    stage === 'diagnose' ? null : stage === 'optimize' ? score : 62;

  return (
    <div className="relative min-w-0 overflow-hidden rounded-xl border border-slate-200/80 bg-white p-4 shadow-[0_32px_100px_rgba(2,8,23,0.28)] backdrop-blur sm:p-6 dark:border-white/10 dark:bg-zinc-950/95">
      <style>{`
        @keyframes resumefit-scan-flow {
          0% { transform: translateY(0); opacity: 0; }
          20%, 72% { opacity: 1; }
          100% { transform: translateY(124px); opacity: 0; }
        }
        @keyframes resumefit-click-flow {
          0% { transform: translate(22px, 18px) scale(0.96); opacity: 0; }
          35%, 72% { transform: translate(0, 0) scale(1); opacity: 1; }
          100% { transform: translate(0, 0) scale(0.92); opacity: 0; }
        }
        @keyframes resumefit-reveal-flow {
          0% { opacity: 0; transform: translateY(8px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .resumefit-flow-motion {
            animation: none !important;
            transform: none !important;
            opacity: 1 !important;
          }
        }
      `}</style>

      <div className="mb-5 grid grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] items-center gap-1.5 sm:gap-2">
        {stages.map((item, index) => (
          <FragmentedFlowNode
            key={item}
            active={index === stageIndex}
            done={index < stageIndex}
            label={copy.flow[item]}
            showArrow={index < stages.length - 1}
          />
        ))}
      </div>

      <div className="grid min-w-0 gap-5 md:grid-cols-[minmax(0,1fr)_7rem]">
        <div className="relative rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5 dark:border-white/10 dark:bg-zinc-900">
          {stage === 'diagnose' ? (
            <span className="resumefit-flow-motion absolute inset-x-5 top-20 h-0.5 animate-[resumefit-scan-flow_1.8s_ease-in-out_infinite] bg-blue-500 shadow-[0_0_18px_rgba(37,99,235,0.8)]" />
          ) : null}

          <div className="mb-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <FileText className="size-4 text-blue-600" />
              {copy.file}
            </div>
            <StatusBadge stage={stage} copy={copy} />
          </div>

          <div className="space-y-4">
            <div>
              <div className="mb-2 text-sm font-semibold">{copy.section}</div>
              <div className="space-y-2">
                <SkeletonLine width="83%" />
                <SkeletonLine width="62%" />
                <SkeletonLine width="76%" />
              </div>
            </div>

            <div className="rounded-md bg-slate-50 p-4 dark:bg-zinc-950">
              <p
                className={cn(
                  'text-sm text-slate-500',
                  stage === 'optimize' &&
                    'line-through decoration-slate-500 decoration-2'
                )}
              >
                {copy.old}
              </p>
              {stage === 'optimize' ? (
                <p className="resumefit-flow-motion mt-3 animate-[resumefit-reveal-flow_500ms_ease-out_forwards] text-sm font-medium text-green-700 dark:text-green-400">
                  {copy.next}
                </p>
              ) : null}
            </div>

            {stage === 'confirm' ? (
              <div className="relative rounded-md border border-blue-200 bg-blue-50 p-4 dark:border-blue-900/60 dark:bg-blue-950/30">
                <div className="mb-3 flex items-center gap-2 text-sm font-medium text-blue-700 dark:text-blue-300">
                  <Sparkles className="size-4" />
                  {copy.confirmTitle}
                </div>
                <button className="inline-flex h-9 items-center justify-center rounded-md bg-blue-600 px-4 text-sm font-medium text-white">
                  {copy.optimize}
                </button>
                <MousePointerClick className="resumefit-flow-motion pointer-events-none absolute right-8 bottom-5 size-8 animate-[resumefit-click-flow_1.4s_ease-in-out_infinite] fill-white text-slate-950 drop-shadow-md dark:fill-zinc-950 dark:text-white" />
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-4 md:flex-col">
            <div className="relative h-40 w-4 shrink-0 overflow-hidden rounded-sm bg-slate-100 sm:h-48 sm:w-5 dark:bg-zinc-900">
              <div
              className="absolute inset-x-0 bottom-0 rounded-sm bg-gradient-to-t from-blue-700 via-blue-600 to-cyan-400 transition-all duration-700 ease-out"
              style={{ height: `${progress}%` }}
            />
          </div>
          <div className="min-w-24 text-center md:min-w-0">
            <div className="text-4xl font-semibold text-blue-600 tabular-nums sm:text-5xl">
              {displayScore ?? '--'}
            </div>
            <div className="text-muted-foreground mt-1 text-xs">
              {copy.score}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FragmentedFlowNode({
  active,
  done,
  label,
  showArrow,
}: {
  active: boolean;
  done: boolean;
  label: string;
  showArrow: boolean;
}) {
  return (
    <>
      <div
        className={cn(
          'flex h-10 items-center justify-center gap-2 rounded-md border bg-white px-2 text-xs font-medium text-slate-500 transition dark:bg-zinc-950',
          active && 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm',
          done && 'border-green-600 bg-green-50 text-green-700'
        )}
      >
        {done ? (
          <Check className="size-4 shrink-0" />
        ) : (
          <ScanSearch className="size-4 shrink-0" />
        )}
        {label}
      </div>
      {showArrow ? (
        <ArrowRight
          className={cn(
            'size-4 text-slate-300 transition',
            (done || active) && 'text-blue-500'
          )}
        />
      ) : null}
    </>
  );
}

function StatusBadge({
  stage,
  copy,
}: {
  stage: DemoStage;
  copy: ReturnType<typeof getDemoCopy>;
}) {
  const tone =
    stage === 'optimize'
      ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300'
      : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300';

  return (
    <span className={cn('rounded-full px-3 py-1 text-xs font-medium', tone)}>
      {copy.badge[stage]}
    </span>
  );
}

function SkeletonLine({ width }: { width: string }) {
  return (
    <div
      className="h-2 rounded-full bg-slate-200 dark:bg-slate-700"
      style={{ width }}
    />
  );
}

function getDemoCopy(locale: 'zh' | 'en') {
  if (locale === 'en') {
    return {
      file: 'my-resume.pdf',
      section: 'Experience',
      score: 'Match score',
      old: 'Responsible for user growth campaigns',
      next: 'Led 3 growth campaigns, improving signup conversion by 18%',
      optimize: 'Start optimization',
      confirmTitle: 'Optimization available',
      flow: {
        diagnose: 'Diagnose',
        score: 'Score',
        confirm: 'Confirm',
        optimize: 'Rewrite',
      },
      badge: {
        diagnose: 'Reading resume',
        score: 'Score found',
        confirm: 'Awaiting click',
        optimize: 'Optimized',
      },
    };
  }

  return {
    file: '我的简历.pdf',
    section: '工作经历',
    score: '匹配分',
    old: '负责用户增长活动',
    next: '主导 3 场增长活动，注册转化率提升 18%',
    optimize: '开始优化',
    confirmTitle: '是否开始优化这份简历？',
    flow: {
      diagnose: '诊断',
      score: '评分',
      confirm: '确认',
      optimize: '改写',
    },
    badge: {
      diagnose: '读取简历',
      score: '显示评分',
      confirm: '等待点击',
      optimize: '已优化',
    },
  };
}
