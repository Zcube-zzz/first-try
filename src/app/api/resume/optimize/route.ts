import { z } from 'zod';

import { respData, respErr } from '@/shared/lib/resp';
import { runResumeOptimization } from '@/shared/services/resume';

export const runtime = 'nodejs';

const requestSchema = z.object({
  resumeText: z.string().trim().min(1, 'Resume text is required').max(50000),
  targetRole: z.string().trim().optional(),
  jdText: z.string().trim().optional(),
  templateId: z.string().trim().optional(),
  styleId: z.string().trim().optional(),
  layoutTemplateId: z.string().trim().optional(),
  visualThemeId: z.string().trim().optional(),
  locale: z.enum(['zh', 'en']).optional(),
  draftTitle: z.string().trim().min(1).max(120).optional(),
  rewriteScope: z.enum(['full', 'unlocked', 'paragraph']).optional(),
  paragraphs: z
    .array(
      z.object({
        id: z.string().regex(/^p_\d+$/),
        text: z.string().trim().min(1).max(50000),
      })
    )
    .min(1)
    .max(500)
    .refine(
      (paragraphs) =>
        new Set(paragraphs.map((paragraph) => paragraph.id)).size ===
          paragraphs.length &&
        paragraphs.reduce(
          (sum, paragraph) => sum + paragraph.text.length + 1,
          0
        ) <= 50000,
      'Invalid paragraph payload'
    )
    .optional(),
  slots: z
    .array(
      z.object({
        id: z.string().regex(/^[A-Za-z][A-Za-z0-9_]{0,63}$/),
        sourceId: z.string().max(128).optional(),
        label: z.string().max(100),
        prompt: z.string().max(300),
        fallbackText: z.string().max(200),
      })
    )
    .max(200)
    .optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = requestSchema.parse(body);
    if (input.paragraphs)
      input.resumeText = input.paragraphs
        .map((paragraph) => paragraph.text)
        .join('\n');
    const result = await runResumeOptimization(input);

    return respData(result);
  } catch (error: any) {
    return respErr(error.message || 'Resume optimization failed');
  }
}
