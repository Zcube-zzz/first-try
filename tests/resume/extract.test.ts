import assert from 'node:assert/strict';

import { extractResumeTextFromFile } from '@/shared/services/resume/extract';

async function main() {
  const textFile = new File(['张三 产品经理 数据分析'], 'resume.txt', {
    type: 'text/plain',
  });
  const textResult = await extractResumeTextFromFile(textFile);
  assert.equal(textResult.text.includes('产品经理'), true);
  assert.equal(textResult.sourceType, 'text');

  const badFile = new File(['x'], 'resume.exe', {
    type: 'application/x-msdownload',
  });
  await assert.rejects(
    () => extractResumeTextFromFile(badFile),
    /Unsupported resume file type/
  );
}

main();
