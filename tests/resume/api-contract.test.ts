import assert from 'node:assert/strict';

import { POST as diagnosePost } from '@/app/api/resume/diagnose/route';
import { POST as parsePost } from '@/app/api/resume/parse/route';

async function main() {
  const badParse = await parsePost(
    new Request('http://test/api/resume/parse', {
      method: 'POST',
      body: new FormData(),
    })
  );
  const badParseJson = await badParse.json();
  assert.equal(badParseJson.code, -1);

  const diagnose = await diagnosePost(
    new Request('http://test/api/resume/diagnose', {
      method: 'POST',
      body: JSON.stringify({
        resumeText: '产品经理 SQL 用户增长',
        targetRole: '增长产品经理',
        jdText: 'SQL 用户增长',
        locale: 'zh',
      }),
    })
  );
  const diagnoseJson = await diagnose.json();
  assert.equal(diagnoseJson.code, 0);
  assert.equal(typeof diagnoseJson.data.score, 'number');
}

main();
