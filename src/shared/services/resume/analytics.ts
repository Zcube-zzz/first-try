import { track } from '@vercel/analytics';

export type ResumeAnalyticsEvent =
  | 'resume_upload_completed'
  | 'resume_diagnosis_completed'
  | 'resume_optimization_completed'
  | 'resume_copy_clicked'
  | 'resume_docx_downloaded'
  | 'resume_parse_completed'
  | 'resume_optimization_failed'
  | 'resume_slot_resolved'
  | 'resume_paragraph_edited'
  | 'resume_file_exported'
  | 'resume_export_failed'
  | 'resume_pdf_print_closed'
  | 'resume_diagnosis_feedback_submitted'
  | 'resume_optimization_feedback_submitted';

type ResumeAnalyticsProperty = string | number | boolean | null;

const allowedProperties = new Set([
  'locale',
  'source',
  'confidence',
  'scoreBand',
  'scenario',
  'layout',
  'theme',
  'accuracy',
  'helpfulArea',
  'hasComment',
  'useIntent',
  'truthConcern',
  'payInterest',
  'format',
  'duration_ms',
  'degraded',
  'outcome',
  'slot_count',
  'scope',
  'slot_id',
  'action',
  'paragraph_id',
  'paragraph_index',
  'stage',
  'save_confirmed',
]);

export function resumeAnalyticsProperties(
  properties: Record<string, ResumeAnalyticsProperty>
) {
  return Object.fromEntries(
    Object.entries(properties).filter(([key, value]) => {
      if (!allowedProperties.has(key)) return false;
      if (key === 'slot_id')
        return typeof value === 'string' && /^slot_[a-z0-9_]+$/i.test(value);
      if (key === 'paragraph_id')
        return typeof value === 'string' && /^p_\d+$/.test(value);
      if (typeof value === 'number')
        return Number.isFinite(value) && value >= 0;
      return true;
    })
  );
}

export function trackResumeEvent(
  name: ResumeAnalyticsEvent,
  properties: Record<string, ResumeAnalyticsProperty> = {}
) {
  if (typeof window === 'undefined') return;

  try {
    track(name, resumeAnalyticsProperties(properties));
  } catch {
    // Analytics must never interrupt the resume workflow.
  }
}
