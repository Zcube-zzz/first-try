import { ArrowDown } from 'lucide-react';

import {
  ResumeDemoAnimation,
  ResumeOptimizer,
} from '@/shared/blocks/resume';
import { cn } from '@/shared/lib/utils';
import { Section } from '@/shared/types/blocks/landing';

export function ResumeHero({
  section,
  className,
}: {
  section: Section;
  className?: string;
}) {
  const locale = section.locale === 'en' ? 'en' : 'zh';

  return (
    <section
      id={section.id}
      className={cn(
        'relative overflow-hidden bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_72%,#ffffff_100%)] pt-24 pb-6 dark:bg-[linear-gradient(180deg,#020617_0%,#07111f_72%,#020617_100%)]',
        section.className,
        className
      )}
    >
      <div className="container">
        <div className="grid min-h-[calc(100vh-6rem)] items-center gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-8">
            <div className="space-y-5">
              <p className="text-sm font-medium tracking-normal text-blue-600">
                {section.label}
              </p>
              <div className="space-y-3">
                <h1 className="text-5xl leading-tight font-semibold text-slate-950 text-balance sm:text-6xl dark:text-white">
                  {section.title}
                </h1>
                {section.subtitle ? (
                  <p className="text-4xl font-semibold text-blue-600 sm:text-5xl">
                    {section.subtitle}
                  </p>
                ) : null}
              </div>
              <p
                className="text-muted-foreground max-w-xl text-lg leading-8"
                dangerouslySetInnerHTML={{ __html: section.description ?? '' }}
              />
            </div>

            <ResumeOptimizer copy={section.optimizer_copy} locale={locale} />
          </div>

          <div className="lg:pl-4">
            <ResumeDemoAnimation locale={locale} />
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex translate-y-1/2 justify-center">
        <div className="bg-background flex size-12 items-center justify-center rounded-full border shadow-sm">
          <ArrowDown className="size-5 text-blue-600" />
        </div>
      </div>
    </section>
  );
}
