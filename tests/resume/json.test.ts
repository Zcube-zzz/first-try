import assert from 'node:assert/strict';

import { parseModelJson } from '@/shared/services/resume/json';

assert.deepEqual(parseModelJson<{ score: number }>('{"score":82}'), {
  score: 82,
});
assert.deepEqual(
  parseModelJson<{ score: number }>('```json\n{"score":91}\n```'),
  { score: 91 }
);
assert.throws(() => parseModelJson('not json'), /valid JSON/);
