import { setRequestLocale } from 'next-intl/server';

import { ResumeWorkflowPage } from '@/shared/blocks/resume';

export default async function ResumeOptimizePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <ResumeWorkflowPage locale={locale} initialStep="optimize" />;
}
