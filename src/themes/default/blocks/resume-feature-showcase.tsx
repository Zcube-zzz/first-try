'use client';

import { useState } from 'react';
import { ArrowRight } from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import { SmartIcon } from '@/shared/blocks/common/smart-icon';
import { ScrollAnimation } from '@/shared/components/ui/scroll-animation';
import { cn } from '@/shared/lib/utils';
import { Section } from '@/shared/types/blocks/landing';

export function ResumeFeatureShowcase({
  section,
  className,
}: {
  section: Section;
  className?: string;
}) {
  const items = section.items ?? [];
  const [activeIndex, setActiveIndex] = useState(0);
  const activeItem = items[activeIndex] ?? items[0];
  const preview = activeItem?.preview ?? {};
  const activeUrl = activeItem?.url || '/resume';

  return (
    <section
      id={section.id}
      className={cn('py-16 md:py-24', section.className, className)}
    >
      <div className="container">
        <ScrollAnimation>
          <div className="mb-10 max-w-3xl">
            <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
              {section.title}
            </h2>
            <p className="text-muted-foreground mt-4 text-lg">
              {section.description}
            </p>
          </div>
        </ScrollAnimation>

        <ScrollAnimation delay={0.15}>
          <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="grid gap-3">
              {items.map((item, index) => {
                const isActive = index === activeIndex;

                return (
                  <Link
                    key={item.title ?? index}
                    href={item.url || '/resume'}
                    onMouseEnter={() => setActiveIndex(index)}
                    onFocus={() => setActiveIndex(index)}
                    className={cn(
                      'group rounded-lg border bg-background p-5 transition hover:border-blue-400 hover:bg-blue-50/60 dark:hover:bg-blue-950/20',
                      isActive &&
                        'border-blue-500 bg-blue-50/70 dark:bg-blue-950/30'
                    )}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex gap-3">
                        <span className="mt-1 flex size-10 shrink-0 items-center justify-center rounded-md bg-blue-600 text-white">
                          {item.icon ? (
                            <SmartIcon name={item.icon as string} size={20} />
                          ) : null}
                        </span>
                        <span>
                          <span className="block font-semibold">
                            {item.title}
                          </span>
                          <span className="text-muted-foreground mt-1 block text-sm leading-6">
                            {item.description}
                          </span>
                        </span>
                      </div>
                      <ArrowRight className="mt-1 size-5 shrink-0 text-blue-600 transition group-hover:translate-x-1" />
                    </div>
                  </Link>
                );
              })}
            </div>

            {activeItem ? (
              <Link
                href={activeUrl}
                className="group flex min-h-[26rem] flex-col justify-between rounded-lg border bg-white p-6 shadow-sm transition hover:border-blue-400 dark:bg-zinc-950"
              >
                <div>
                  <div className="text-sm font-medium text-blue-600">
                    {preview.label ?? activeItem.title}
                  </div>
                  <h3 className="mt-3 text-2xl font-semibold">
                    {preview.title ?? activeItem.title}
                  </h3>
                  <p className="text-muted-foreground mt-3 text-sm leading-6">
                    {preview.description ?? activeItem.description}
                  </p>
                </div>

                <div className="mt-8 grid gap-4">
                  {(preview.items ?? []).map((item: string, index: number) => (
                    <div key={item} className="flex items-center gap-3">
                      <div className="flex size-8 items-center justify-center rounded-md bg-slate-100 text-sm font-semibold text-slate-700 dark:bg-zinc-900 dark:text-zinc-200">
                        {index + 1}
                      </div>
                      <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-zinc-900">
                        <div
                          className="h-full rounded-full bg-blue-600"
                          style={{ width: `${Math.min(92, 42 + index * 16)}%` }}
                        />
                      </div>
                      <span className="w-28 text-sm">{item}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-blue-600">
                  {preview.cta ?? section.label}
                  <ArrowRight className="size-4 transition group-hover:translate-x-1" />
                </div>
              </Link>
            ) : null}
          </div>
        </ScrollAnimation>
      </div>
    </section>
  );
}
