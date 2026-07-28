# ResumeFit AI Resume SaaS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the ShipAny scaffold into a first working ResumeFit AI product with a simplified upload hero, resume diagnosis, resume rewriting, multilingual landing copy, and hidden unrelated public entrances.

**Architecture:** Keep the first viewport as a dedicated `resume-hero` theme block that renders only product name, upload entry, and the diagnosis-to-rewrite animation. Put resume parsing, scoring, prompt building, and model calls in focused server-side services under `src/shared/services/resume`, then expose thin Next API routes under `src/app/api/resume`. Landing copy remains config-driven through existing next-intl JSON files.

**Tech Stack:** Next.js 16 App Router, React 19, next-intl, Tailwind CSS 4, lucide-react, AI/OpenAI-compatible HTTP API through server env/config, `mammoth` for DOCX extraction, `pdf-parse` for text PDFs, `tsx` assertion tests.

## Global Constraints

- First viewport must contain only product name, resume upload entry, and the diagnosis-to-rewrite animated demo.
- Target role/JD, template selection, style selection, diagnosis report, pricing, FAQ, and feature cards must appear after upload or below the fold.
- Uploaded resume/JD content must stay server-side and must not be logged.
- V1 processes uploaded files in memory and does not persist raw resume, JD, or optimized resume bodies.
- AI output must not claim guaranteed interviews and must surface inferred facts that require user confirmation.
- Preserve existing auth, settings, payment, and admin foundations for later SaaS monetization.
- Hide public entrances unrelated to resume diagnosis/rewriting: AI image, AI music, AI video, generic AI chat, showcases, ShipAny template/demo links.
- Support Chinese and English landing copy, metadata, and key UI text.
- Use TDD for production behavior; tests run with `npx pnpm@10.23.0 exec tsx`.

---

### Task 1: Resume Domain And Deterministic Diagnosis Core

**Files:**
- Create: `src/shared/services/resume/types.ts`
- Create: `src/shared/services/resume/templates.ts`
- Create: `src/shared/services/resume/scoring.ts`
- Create: `src/shared/services/resume/prompts.ts`
- Create: `src/shared/services/resume/json.ts`
- Create: `src/shared/services/resume/index.ts`
- Test: `tests/resume/scoring.test.ts`
- Test: `tests/resume/prompts.test.ts`
- Test: `tests/resume/json.test.ts`

**Interfaces:**
- Produces: `ResumeTemplate`, `ResumeRewriteStyle`, `ResumeDiagnosis`, `ResumeOptimizationResult`, `ResumeRequestContext`.
- Produces: `RESUME_TEMPLATES`, `RESUME_REWRITE_STYLES`, `getResumeTemplate(id)`, `getResumeRewriteStyle(id)`.
- Produces: `createDeterministicDiagnosis(input: ResumeRequestContext): ResumeDiagnosis`.
- Produces: `buildDiagnosisPrompt(input: ResumeRequestContext): string` and `buildOptimizationPrompt(input: ResumeRequestContext): string`.
- Produces: `parseModelJson<T>(content: string): T`.

- [ ] **Step 1: Write failing scoring tests**

```typescript
import assert from 'node:assert/strict';

import { createDeterministicDiagnosis } from '@/shared/services/resume/scoring';

const strong = createDeterministicDiagnosis({
  resumeText: '产品经理 用户增长 数据分析 A/B测试 SQL 转化率 项目管理 需求分析',
  targetRole: '用户增长产品经理',
  jdText: '负责用户增长、A/B测试、数据分析、SQL、转化率提升和跨团队项目管理',
  locale: 'zh',
});

assert.equal(strong.score >= 70, true);
assert.equal(strong.keywordMatches.includes('用户增长'), true);
assert.equal(strong.keywordMatches.includes('SQL'), true);
assert.equal(strong.keywordGaps.length <= 3, true);

const weak = createDeterministicDiagnosis({
  resumeText: '负责日常工作 协助团队 完成任务',
  targetRole: 'AI 产品经理',
  jdText: 'Agent workflow LLM prompt 数据分析 产品策略',
  locale: 'zh',
});

assert.equal(weak.score < 70, true);
assert.equal(weak.keywordGaps.includes('Agent'), true);
assert.equal(weak.issues.length > 0, true);
```

- [ ] **Step 2: Run scoring tests to verify RED**

Run: `npx pnpm@10.23.0 exec tsx tests/resume/scoring.test.ts`

Expected: FAIL because `src/shared/services/resume/scoring.ts` does not exist.

- [ ] **Step 3: Implement minimal domain types, templates, styles, and scoring**

Implement:
- score range 0-100.
- keyword extraction from JD/target role with English and Chinese token support.
- `keywordMatches`, `keywordGaps`, `strengths`, `issues`, `suggestions`, `sectionScores`.
- deterministic fallback score that improves with keyword coverage, quantified resume text, and sufficient resume length.

- [ ] **Step 4: Run scoring tests to verify GREEN**

Run: `npx pnpm@10.23.0 exec tsx tests/resume/scoring.test.ts`

Expected: PASS.

- [ ] **Step 5: Write failing prompt tests**

```typescript
import assert from 'node:assert/strict';

import {
  buildDiagnosisPrompt,
  buildOptimizationPrompt,
} from '@/shared/services/resume/prompts';

const base = {
  resumeText: '负责用户增长活动',
  targetRole: '增长产品经理',
  jdText: '需要增长实验、数据分析、转化率优化',
  templateId: 'product-manager',
  styleId: 'achievement-focused',
  locale: 'zh' as const,
};

const diagnosisPrompt = buildDiagnosisPrompt(base);
assert.equal(diagnosisPrompt.includes('JSON'), true);
assert.equal(diagnosisPrompt.includes('不要编造'), true);
assert.equal(diagnosisPrompt.includes('增长产品经理'), true);

const optimizationPrompt = buildOptimizationPrompt(base);
assert.equal(optimizationPrompt.includes('成果强化型'), true);
assert.equal(optimizationPrompt.includes('产品经理'), true);
assert.equal(optimizationPrompt.includes('需要用户确认'), true);
```

- [ ] **Step 6: Run prompt tests to verify RED**

Run: `npx pnpm@10.23.0 exec tsx tests/resume/prompts.test.ts`

Expected: FAIL because `prompts.ts` is missing.

- [ ] **Step 7: Implement prompt builders**

Implement prompts that embed template/style instructions, strict JSON schema, privacy/fact rules, and Chinese/English output guidance.

- [ ] **Step 8: Run prompt tests to verify GREEN**

Run: `npx pnpm@10.23.0 exec tsx tests/resume/prompts.test.ts`

Expected: PASS.

- [ ] **Step 9: Write failing JSON parser tests**

```typescript
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
```

- [ ] **Step 10: Run JSON tests to verify RED**

Run: `npx pnpm@10.23.0 exec tsx tests/resume/json.test.ts`

Expected: FAIL because `json.ts` is missing.

- [ ] **Step 11: Implement JSON parser**

Support raw JSON and fenced JSON blocks. Throw `Model response is not valid JSON` for malformed output.

- [ ] **Step 12: Run JSON tests to verify GREEN**

Run: `npx pnpm@10.23.0 exec tsx tests/resume/json.test.ts`

Expected: PASS.

### Task 2: Server-Side File Extraction And AI Adapter

**Files:**
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Create: `src/shared/services/resume/extract.ts`
- Create: `src/shared/services/resume/model.ts`
- Test: `tests/resume/extract.test.ts`
- Test: `tests/resume/model.test.ts`

**Interfaces:**
- Produces: `extractResumeTextFromFile(file: File): Promise<ResumeExtractionResult>`.
- Produces: `runResumeDiagnosis(input: ResumeRequestContext): Promise<ResumeDiagnosis>`.
- Produces: `runResumeOptimization(input: ResumeRequestContext): Promise<ResumeOptimizationResult>`.
- Consumes: prompt builders and deterministic fallback from Task 1.

- [ ] **Step 1: Add extraction dependencies**

Run: `npx pnpm@10.23.0 add mammoth pdf-parse`

- [ ] **Step 2: Write failing extraction tests**

```typescript
import assert from 'node:assert/strict';

import { extractResumeTextFromFile } from '@/shared/services/resume/extract';

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
```

- [ ] **Step 3: Run extraction tests to verify RED**

Run: `npx pnpm@10.23.0 exec tsx tests/resume/extract.test.ts`

Expected: FAIL because `extract.ts` is missing.

- [ ] **Step 4: Implement extractor**

Implement text/plain direct extraction, DOCX through `mammoth.extractRawText`, text PDF through `pdf-parse`, and image files as `sourceType: "image"` with a clear message requiring OCR/model extraction when called without model support.

- [ ] **Step 5: Run extraction tests to verify GREEN**

Run: `npx pnpm@10.23.0 exec tsx tests/resume/extract.test.ts`

Expected: PASS.

- [ ] **Step 6: Write failing model adapter tests**

```typescript
import assert from 'node:assert/strict';

import { runResumeDiagnosis } from '@/shared/services/resume/model';

const previousFetch = globalThis.fetch;
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
```

- [ ] **Step 7: Run model tests to verify RED**

Run: `npx pnpm@10.23.0 exec tsx tests/resume/model.test.ts`

Expected: FAIL because `model.ts` is missing.

- [ ] **Step 8: Implement model adapter**

Use `EVOLINK_API_KEY`/`EVOLINK_BASE_URL`/`EVOLINK_FREE_MODEL` first, then fall back to `OPENROUTER_API_KEY`/`OPENROUTER_BASE_URL`/`RESUMEFIT_FREE_MODEL`. POST to `/chat/completions`, parse assistant JSON, and return deterministic fallback if no API key is configured.

- [ ] **Step 9: Run model tests to verify GREEN**

Run: `npx pnpm@10.23.0 exec tsx tests/resume/model.test.ts`

Expected: PASS.

### Task 3: Resume API Routes

**Files:**
- Create: `src/app/api/resume/parse/route.ts`
- Create: `src/app/api/resume/diagnose/route.ts`
- Create: `src/app/api/resume/optimize/route.ts`
- Test: `tests/resume/api-contract.test.ts`

**Interfaces:**
- `POST /api/resume/parse`: accepts multipart `file`; returns `ResumeExtractionResult`.
- `POST /api/resume/diagnose`: accepts `ResumeRequestContext`; returns `ResumeDiagnosis`.
- `POST /api/resume/optimize`: accepts `ResumeRequestContext`; returns `ResumeOptimizationResult`.

- [ ] **Step 1: Write failing API contract tests**

```typescript
import assert from 'node:assert/strict';

import { POST as diagnosePost } from '@/app/api/resume/diagnose/route';
import { POST as parsePost } from '@/app/api/resume/parse/route';

const badParse = await parsePost(new Request('http://test/api/resume/parse', {
  method: 'POST',
  body: new FormData(),
}));
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
```

- [ ] **Step 2: Run API contract tests to verify RED**

Run: `npx pnpm@10.23.0 exec tsx tests/resume/api-contract.test.ts`

Expected: FAIL because API routes are missing.

- [ ] **Step 3: Implement API routes**

Use `respData` and `respErr`. Validate required `resumeText` for diagnose/optimize. Validate `file` for parse. Never log raw resume or JD content.

- [ ] **Step 4: Run API contract tests to verify GREEN**

Run: `npx pnpm@10.23.0 exec tsx tests/resume/api-contract.test.ts`

Expected: PASS.

### Task 4: Homepage Resume Hero, Upload Flow, And Animation

**Files:**
- Create: `src/themes/default/blocks/resume-hero.tsx`
- Create: `src/shared/blocks/resume/resume-demo-animation.tsx`
- Create: `src/shared/blocks/resume/resume-optimizer.tsx`
- Create: `src/shared/blocks/resume/index.ts`

**Interfaces:**
- Consumes: `section` content from `pages/index.json`.
- Client flow calls `/api/resume/parse`, `/api/resume/diagnose`, and `/api/resume/optimize`.

- [ ] **Step 1: Implement `ResumeDemoAnimation`**

Build a CSS keyframe/transition animation with four states: diagnosis scan, score 62, cursor click on optimize, strikethrough old text/new text/score 88. Respect `motion-reduce`.

- [ ] **Step 2: Implement `ResumeOptimizer`**

Render upload/paste entry first. After upload or paste, reveal target role/JD, template buttons, style segmented buttons, diagnose and optimize actions, loading/error states, diagnosis result, optimized resume, and fact confirmation warnings.

- [ ] **Step 3: Implement `ResumeHero`**

Desktop layout: left product name/upload entry, right animation. Mobile layout: stacked. First viewport must not show JD/template/style until the user uploads or pastes resume content.

- [ ] **Step 4: Register block export**

Export `ResumeHero` from `src/themes/default/blocks/resume-hero.tsx`; no central registry change is required because `getThemeBlock` imports by block file name.

### Task 5: Landing Copy, Metadata, And Hidden Entrances

**Files:**
- Modify: `src/config/locale/messages/zh/pages/index.json`
- Modify: `src/config/locale/messages/en/pages/index.json`
- Modify: `src/config/locale/messages/zh/landing.json`
- Modify: `src/config/locale/messages/en/landing.json`
- Modify: `src/config/locale/messages/zh/common.json`
- Modify: `src/config/locale/messages/en/common.json`
- Modify: `content/pages/privacy-policy.zh.mdx`
- Modify: `content/pages/privacy-policy.mdx`
- Modify: `content/pages/terms-of-service.zh.mdx`
- Modify: `content/pages/terms-of-service.mdx`
- Modify: `.env.example`
- Modify: `package.json`

**Interfaces:**
- `pages.index.page.sections.hero.block` must be `resume-hero`.
- Header/footer nav must expose resume-focused anchors and account entry only.

- [ ] **Step 1: Replace homepage sections**

Set `show_sections` to `hero`, `introduce`, `features`, `usage`, `faq`, `cta`. Use resume-focused copy for every section.

- [ ] **Step 2: Hide unrelated navigation**

Remove public nav entries for showcases, docs/templates, AI image/music/video, and generic chat. Keep login/register, locale, theme, settings/account.

- [ ] **Step 3: Update metadata and legal copy**

Set app name/title/description/keywords to ResumeFit AI / 简历精修 AI. Update legal pages to say uploads are processed for resume diagnosis/rewriting and not used for training.

- [ ] **Step 4: Update package metadata**

Set package `name`, `author`, `homepage`, `keywords` to product-specific non-ShipAny values while keeping version private.

### Task 6: Verification And Local Preview

**Files:**
- No production files unless verification exposes defects.

**Interfaces:**
- Confirms implementation works through automated and manual checks.

- [ ] **Step 1: Run all resume tests**

Run: `npx pnpm@10.23.0 exec tsx tests/resume/scoring.test.ts`

Run: `npx pnpm@10.23.0 exec tsx tests/resume/prompts.test.ts`

Run: `npx pnpm@10.23.0 exec tsx tests/resume/json.test.ts`

Run: `npx pnpm@10.23.0 exec tsx tests/resume/extract.test.ts`

Run: `npx pnpm@10.23.0 exec tsx tests/resume/model.test.ts`

Run: `npx pnpm@10.23.0 exec tsx tests/resume/api-contract.test.ts`

- [ ] **Step 2: Run TypeScript check**

Run: `npx pnpm@10.23.0 exec tsc --noEmit`

- [ ] **Step 3: Run production build**

Run: `npx pnpm@10.23.0 build`

- [ ] **Step 4: Run local dev server and inspect homepage**

Run: `npx pnpm@10.23.0 dev`.

Open `/` and `/zh`. Confirm first viewport only shows product name, upload entry, and animation; lower page contains feature sections; unrelated entries are absent from public header/footer.

- [ ] **Step 5: Final git review**

Run: `git diff --check`, `git status --short --branch`, and `git diff --stat`. Stage intentional files only and commit.

## Self-Review

Spec coverage:
- Automatic diagnosis: Tasks 1, 2, 3, 4.
- Automatic modification: Tasks 1, 2, 3, 4.
- PDF/DOCX/text extraction and image handling: Task 2.
- Hero upload placement and animation: Task 4.
- Landing copy and multilingual metadata: Task 5.
- Hide unrelated product entrances: Task 5.
- Verification: Task 6.

Placeholder scan:
- No `TBD`, `TODO`, or undefined task outputs remain.

Type consistency:
- `ResumeRequestContext`, `ResumeDiagnosis`, `ResumeOptimizationResult`, `ResumeExtractionResult`, `templateId`, and `styleId` are used consistently across tasks.
