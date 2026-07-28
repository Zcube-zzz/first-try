# ResumeFit AI V1 Design

Date: 2026-07-27
Status: Approved product direction, pending implementation plan

## Product Identity

Chinese name: 简历精修 AI

English name: ResumeFit AI

Positioning: An AI resume diagnosis and rewriting SaaS that helps users upload a resume, compare it against a target JD or role direction, receive a match score, then generate a polished resume using a selected resume template and writing style.

Primary reference: Resume Worded style homepage conversion pattern, with the resume upload experience placed directly in the first viewport hero area.

## V1 Goals

- Turn the current ShipAny scaffold into a resume-focused SaaS product.
- Put only the product name, resume upload entry, and diagnosis-to-rewrite animation in the homepage hero.
- Diagnose resume-to-role fit with a clear score and actionable issues.
- Generate an improved resume from user resume text plus role/JD context.
- Let users choose a resume template and writing style before generation.
- Support Chinese and English landing copy, metadata, and key UI text.
- Hide unrelated scaffold entries such as AI image, music, video, generic chat, showcases, and template-selling content.
- Keep API keys and resume processing server-side.

## V1 User Flow

1. User opens the homepage.
2. Hero shows the product name, a resume upload panel, paste-text fallback, and a diagnosis-to-rewrite animation.
3. User uploads `.pdf`, `.docx`, `.png`, `.jpg`, or `.jpeg`, or pastes resume text directly.
4. Server parses the file and returns extracted text plus parsing confidence.
5. User provides target role or optional JD in the post-upload flow.
6. User chooses a resume template and writing style.
7. User clicks diagnose or optimize.
8. The diagnosis result shows match score, strengths, gaps, keyword misses, section issues, and next action.
9. The optimize result shows a complete rewritten resume, change notes, and facts that require user confirmation.
10. Guest users can receive a partial diagnosis; logged-in users receive the full diagnosis and one full free optimization experience in V1.

## Page And Navigation Scope

### Homepage

The homepage becomes the product surface, not a generic marketing page.

Hero content:

- Product name and concise brand promise.
- File upload zone in first viewport.
- Paste resume text fallback.
- Primary upload/start action.
- Animated demo showing diagnosis, score, optimization click, struck-through old text, replacement text, and a rising score.

Do not place target role input, JD textarea, template selection, style selection, feature cards, pricing cards, FAQ, or dense navigation in the first viewport. Those belong in the post-upload flow or below-fold landing sections.

Landing sections after hero:

- How it works.
- Diagnosis capabilities.
- Resume rewrite templates and styles.
- Target users and use cases.
- Privacy and fact-verification note.
- FAQ.
- CTA back to the upload flow.

### Hidden Entrances

Remove or hide public navigation links for:

- AI image generator.
- AI music generator.
- AI video generator.
- Generic AI chat.
- Showcases.
- ShipAny docs/templates references.
- Demo social/community links that still point to placeholders.

Keep or repurpose:

- Sign in and sign up, because V1 access rules need logged-in full generation.
- Settings/profile/billing only where they remain relevant after login.
- Admin, because operators still need users, settings, payments, credits, and future prompt management.

## Resume Input And Parsing

Create a dedicated resume parsing route:

`POST /api/resume/parse`

Accepted inputs:

- `.docx`
- `.pdf`
- `.png`
- `.jpg`
- `.jpeg`
- pasted text through the optimize/diagnose route without file upload

Parsing strategy:

- DOCX: extract text server-side with `mammoth`.
- Text PDFs: extract embedded text with `pdf-parse` or `pdfjs-dist`.
- Images: OCR with `tesseract.js` using Chinese and English language data.
- Scanned PDFs: first attempt embedded text extraction; if extracted text is too short, rasterize a limited number of pages with `pdfjs-dist` and `@napi-rs/canvas`, then OCR those page images with `tesseract.js`.
- If scanned-PDF rendering fails in the deployment environment, return a friendly fallback asking the user to paste text or upload screenshots/images; do not return an empty or misleading result.

Limits:

- Maximum file size: 10 MB.
- Maximum scanned PDF OCR pages in V1: 8 pages.
- Do not store uploaded files in V1.
- Do not log raw resume or JD text.

Response shape:

```json
{
  "text": "string",
  "filename": "string",
  "sourceType": "docx | pdf_text | pdf_ocr | image_ocr | pasted",
  "confidence": "high | medium | low",
  "warnings": ["string"]
}
```

## Diagnosis Capability

Create a dedicated route:

`POST /api/resume/diagnose`

Input:

```json
{
  "resumeText": "string",
  "targetRole": "string",
  "jdText": "string optional"
}
```

Output:

```json
{
  "mode": "guest_partial | full_free | gated",
  "targetRole": "string",
  "jdUsed": true,
  "overallScore": 0,
  "matchLevel": "low | medium | high",
  "summary": "string",
  "strengths": ["string"],
  "topIssues": ["string"],
  "keywordGaps": ["string"],
  "sectionIssues": [
    {
      "section": "string",
      "issue": "string",
      "suggestion": "string"
    }
  ],
  "sampleRewrite": {
    "before": "string",
    "after": "string"
  }
}
```

Scoring logic:

- Use the AI model to analyze role fit, ATS readability, JD keyword coverage, experience relevance, achievement strength, and risk factors.
- Ask the model to return strict JSON only.
- Add server-side validation and defensive fallback for invalid model output.
- Scores should be useful product signals, not presented as guaranteed hiring outcomes.

## Resume Optimization

Create a dedicated route:

`POST /api/resume/optimize`

Input:

```json
{
  "resumeText": "string",
  "targetRole": "string",
  "jdText": "string optional",
  "templateId": "string",
  "styleId": "string",
  "allowInferredMetrics": false
}
```

Output:

```json
{
  "mode": "full_free | gated",
  "templateId": "string",
  "styleId": "string",
  "targetRole": "string",
  "optimizedResume": {
    "personalInfo": "string",
    "summary": "string",
    "coreAdvantages": ["string"],
    "education": ["string"],
    "workExperience": [
      {
        "title": "string",
        "period": "string",
        "bullets": ["string"]
      }
    ],
    "projectExperience": [
      {
        "title": "string",
        "description": "string",
        "bullets": ["string"]
      }
    ],
    "skills": [
      {
        "category": "string",
        "items": ["string"]
      }
    ]
  },
  "modificationNotes": ["string"],
  "factsToConfirm": ["string"]
}
```

## Built-In Prompt Templates

Template choices:

- `campus`: 校招/应届生模板，强调教育、实习、项目、课程/竞赛。
- `experienced`: 社招通用模板，强调职业摘要、核心优势、工作成果。
- `product_manager`: 产品经理模板，强调需求分析、数据指标、协作推进、商业结果。
- `ai_product_manager`: AI 产品经理模板，强调 AI 产品理解、Agent/Workflow、模型应用、工程协作，但禁止编造 AI 经历。
- `tech`: 技术/研发模板，强调技术栈、系统贡献、复杂度、性能和稳定性结果。
- `operation_marketing`: 运营/市场模板，强调增长、内容、渠道、转化和用户洞察。

Style choices:

- `conservative`: 保守事实型，只改表达，不新增未经证实的数据。
- `ats`: ATS 友好型，强化关键词、结构和可解析性。
- `impact`: 成果强化型，把弱表达改为背景、动作、结果。
- `china_bigtech`: 中文大厂型，表达更职业化，突出复杂项目和跨团队推进。

Prompt rules:

- Preserve hard facts: name, school, degree, company, dates, certificates, awards, patents, and role titles unless user provides corrections.
- Do not invent work history, education, tools, AI skills, awards, or metrics.
- If `allowInferredMetrics` is true, the model may propose plausible quantified phrasing, but every such item must be listed in `factsToConfirm`.
- Prefer concrete action-result bullets over vague verbs such as 负责、参与、熟悉.
- Always adapt to the selected template and style.
- Return strict JSON only.

## AI Integration

Use Evolink server-side only.

Environment variables:

- `EVOLINK_API_KEY`
- `EVOLINK_BASE_URL`
- `EVOLINK_FREE_MODEL`
- `EVOLINK_PAID_MODEL`

V1 model usage:

- Guest partial diagnosis: `EVOLINK_FREE_MODEL`.
- Logged-in full diagnosis: `EVOLINK_FREE_MODEL`.
- Logged-in free optimization: `EVOLINK_FREE_MODEL`.
- Paid deep rewrite with `EVOLINK_PAID_MODEL` remains outside V1 implementation.

Implementation shape:

- Add a small server-only Evolink client.
- Keep request/response adapters isolated from route handlers.
- Add JSON validation and repair fallback close to the model client.
- Keep prompt builders in a resume-specific module so product prompts are not scattered across API routes.

## Access Rules

Guest:

- One partial diagnosis per browser using a cookie.
- No complete optimized resume.
- Clear login CTA after partial result.

Logged-in free user:

- One full free diagnosis and one full free optimization per account.
- Uses `EVOLINK_FREE_MODEL`.
- If already used, show a gated message: 深度精修和更多次数即将开放.

Paid:

- Not implemented in V1.
- Existing ShipAny payment and credits infrastructure remains available for V2.

## Data Persistence

Add table:

`resume_optimization_usage`

Fields:

- `id`
- `userId` nullable
- `guestId` nullable
- `type`: `guest_partial | free_diagnosis | free_optimization`
- `templateId` nullable
- `styleId` nullable
- `model`
- `targetRole`
- `createdAt`

V1 does not persist raw resume text, JD text, uploaded files, or optimized resume bodies.

## Landing Copy And Metadata

Update Chinese and English content for:

- `src/config/locale/messages/zh/pages/index.json`
- `src/config/locale/messages/en/pages/index.json`
- `src/config/locale/messages/zh/landing.json`
- `src/config/locale/messages/en/landing.json`
- `src/config/locale/messages/zh/common.json`
- `src/config/locale/messages/en/common.json`
- legal pages under `content/pages`
- `.env.example`
- `.env.development`

Product metadata:

- Name: 简历精修 AI / ResumeFit AI.
- Description: AI resume diagnosis and rewriting tool for matching resumes to target roles and JDs.
- Keywords: resume optimization, resume diagnosis, JD matching, ATS resume, AI resume editor, 简历优化, 简历诊断, 岗位匹配.

## UI Components

Add a focused client block:

`src/shared/blocks/resume/resume-optimizer.tsx`

Responsibilities:

- Upload file or accept pasted resume text.
- Collect target role and optional JD.
- Select template and style via buttons or segmented controls.
- Call parse, diagnose, and optimize APIs.
- Render loading, error, guest-gated, diagnosis, and optimized resume states.
- Show facts requiring confirmation separately.

Use existing UI primitives from `src/shared/components/ui`.

Homepage integration:

- Add a custom `resume-hero` section/block for the first viewport. It should contain only the product name, upload/paste entry, primary upload action, and animated diagnosis-to-rewrite demo.
- The full `resume-optimizer` flow should appear after upload or in a below-fold interaction step where target role/JD, template, style, diagnosis, and rewrite states can expand without crowding the hero.

## Error Handling

User-facing messages:

- Missing resume: 请上传简历，或直接粘贴简历文本.
- Missing target role: 请填写目标岗位或岗位方向.
- Parse failed: 文件解析失败，你可以直接粘贴简历文本继续.
- Low OCR confidence: 识别结果可能不完整，请检查文本后再生成.
- Model error: AI 生成遇到问题，请稍后重试.
- Invalid model JSON: 生成结果格式异常，请重试.
- Free usage exhausted: 你的免费完整体验已使用，深度精修将在下一版开放.

Backend:

- Do not log raw resume/JD content.
- Log only request ids, source type, file size, route name, and error category.

## Privacy And Safety

- Uploaded files are processed in memory and not stored in V1.
- Resume text and JD are not stored in V1.
- AI output must show a fact verification warning.
- The product must not claim guaranteed interview results.
- Any inferred data must be surfaced under facts requiring confirmation.

## Testing And Verification

Automated tests should cover:

- Required target role validation.
- Required resume validation.
- Template/style validation.
- Guest partial diagnosis does not include a full optimized resume.
- Logged-in usage gating.
- Prompt builder preserves selected template/style in model instructions.
- Model JSON parser rejects invalid required fields.
- Parse route rejects unsupported file types and oversized files.

Manual QA should cover:

- Chinese resume pasted without JD.
- Chinese resume pasted with JD.
- DOCX upload.
- Text PDF upload.
- Image OCR upload.
- Scanned PDF with OCR fallback.
- Guest first and second diagnosis attempt.
- Logged-in full free optimization attempt.
- Header/footer no longer expose unrelated AI generator or ShipAny template links.
- English and Chinese landing pages both reflect ResumeFit AI positioning.

## V2 Backlog

- Paid deep rewrite using `EVOLINK_PAID_MODEL`.
- Credits/payment integration for multiple rewrites.
- Word DOCX export with verified layout.
- PDF export.
- Resume history with deletion controls.
- Before/after diff.
- Admin prompt editor.
- Recruiter greeting and platform profile optimization.
- Multiple saved resumes per user.
