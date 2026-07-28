import assert from 'node:assert/strict';

import { runResumeDiagnosis } from '@/shared/services/resume/model';

async function main() {
  const previousFetch = globalThis.fetch;
  const previousEnv = {
    EVOLINK_API_KEY: process.env.EVOLINK_API_KEY,
    EVOLINK_BASE_URL: process.env.EVOLINK_BASE_URL,
    EVOLINK_FREE_MODEL: process.env.EVOLINK_FREE_MODEL,
  };

  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        choices: [
          {
            message: {
              content:
                '{"score":84,"level":"high","summary":"匹配较好","keywordMatches":["SQL"],"keywordGaps":[],"strengths":["数据能力"],"issues":[],"suggestions":[],"sectionScores":{"keywords":90,"experience":80,"ats":82,"readability":84}}',
            },
          },
        ],
      })
    );

  process.env.EVOLINK_API_KEY = 'test-key';
  process.env.EVOLINK_BASE_URL = 'https://example.test/v1';
  process.env.EVOLINK_FREE_MODEL = 'test-model';

  const diagnosis = await runResumeDiagnosis({
    resumeText: 'SQL 数据分析 产品经理',
    targetRole: '产品经理',
    jdText: 'SQL 数据分析',
    locale: 'zh',
  });

  assert.equal(diagnosis.score, 84);
  assert.equal(diagnosis.keywordMatches.includes('SQL'), true);

  globalThis.fetch = previousFetch;
  process.env.EVOLINK_API_KEY = previousEnv.EVOLINK_API_KEY;
  process.env.EVOLINK_BASE_URL = previousEnv.EVOLINK_BASE_URL;
  process.env.EVOLINK_FREE_MODEL = previousEnv.EVOLINK_FREE_MODEL;
}

main();
