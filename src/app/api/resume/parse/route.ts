import { extractResumeTextFromFile } from '@/shared/services/resume';
import { respData, respErr } from '@/shared/lib/resp';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      throw new Error('Resume file is required');
    }

    const result = await extractResumeTextFromFile(file);
    return respData(result);
  } catch (error: any) {
    return respErr(error.message || 'Resume parse failed');
  }
}
