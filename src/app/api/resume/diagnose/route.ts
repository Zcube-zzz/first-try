import { z } from 'zod';

import { respData, respErr } from '@/shared/lib/resp';
import { runResumeDiagnosis } from '@/shared/services/resume';

export const runtime = 'nodejs';

const requestSchema = z.object({
  resumeText: z.string().trim().min(1, 'Resume text is required'),
  targetRole: z.string().trim().optional(),
  jdText: z.string().trim().optional(),
  templateId: z.string().trim().optional(),
  styleId: z.string().trim().optional(),
  locale: z.enum(['zh', 'en']).optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = requestSchema.parse(body);
    const result = await runResumeDiagnosis(input);

    return respData(result);
  } catch (error: any) {
    return respErr(error.message || 'Resume diagnosis failed');
  }
}
