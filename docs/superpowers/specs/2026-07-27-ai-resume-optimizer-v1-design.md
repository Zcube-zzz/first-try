# AI Resume Optimizer V1 Design

Date: 2026-07-27
Status: Draft for user review

## Goal

Build the first usable version of an AI resume optimization feature in the existing ShipAny SaaS project. V1 focuses on proving the core experience: users provide a resume, choose a target role, optionally provide a JD, then receive a resume diagnosis and a complete but basic optimized resume.

V1 deliberately does not include payment, credits, Word export, recruiter greeting generation, or recruiting-platform profile optimization. Those stay for V2.

## Product Scope

### V1 Includes

- Resume input by pasted text
- Resume input by Word/PDF upload, with fallback to manual paste if parsing fails
- Required target role selection or free-text target role
- Optional JD input, strongly recommended in UI copy
- Guest trial: one partial diagnosis only
- Logged-in free experience: one complete diagnosis plus one complete Gemini quick optimized resume
- Result page with complete optimized resume, modification notes, and facts/metrics that require user confirmation
- Evolink model integration using local env settings
- Built-in resume optimization prompt derived from the content-only resume optimization rules

### V1 Excludes

- Payment and credits
- Claude paid deep refinement flow
- Word DOCX export
- PDF export
- Resume version history beyond the current result
- Recruiter greeting/message generation
- Boss/Zhaopin/Liepin/LinkedIn profile optimization
- Admin prompt editor
- Complex before/after diff view

## User Flow

1. User opens the resume optimizer page.
2. User provides resume content by either:
   - Pasting resume text into a textarea
   - Uploading a `.docx` or `.pdf` file
3. If upload parsing fails, the page shows a clear fallback message and keeps the paste textarea available.
4. User selects or types a target role. This is required.
5. User optionally pastes a JD. The UI should say this improves matching quality.
6. User chooses whether AI may add reasonable quantified facts that require confirmation. Default is off.
7. User submits.
8. Backend determines access mode:
   - Guest: return partial diagnosis only
   - Logged-in user with unused free experience: return full diagnosis and full Gemini quick optimized resume
   - Logged-in user who already used free experience: return a gated message for V1, asking them to wait for the deep refinement / paid version
9. Result page displays either the partial guest result or the full logged-in result.

## Access Rules

### Guest

- One trial per browser, tracked by a local cookie
- Guest result only includes partial diagnosis
- Guest result should show enough value to encourage login, but not the full optimized resume

Guest response includes:

- Overall score or grade
- Top 3 issues
- 1 sample rewritten bullet or paragraph
- Login call-to-action

### Logged-In Free User

- One complete free experience per account
- Uses Gemini quick model
- Response includes complete diagnosis and complete optimized resume

Logged-in response includes:

- Overall diagnosis
- Section-level issues
- Complete optimized resume
- Modification notes
- Facts/metrics requiring confirmation

### Paid / V2

- Not implemented in V1
- Future flow will use Claude Sonnet 5 for deep refinement and likely connect to ShipAny credits/payment

## Model Strategy

V1 uses Evolink through server-side API calls only. The API key stays in `.env.development` / production env and is never exposed to the browser.

Environment variables:

- `EVOLINK_API_KEY`
- `EVOLINK_BASE_URL`
- `EVOLINK_FREE_MODEL`
- `EVOLINK_PAID_MODEL`

V1 model usage:

- Guest partial diagnosis: `EVOLINK_FREE_MODEL`, currently `gemini-3.5-flash-lite`
- Logged-in complete diagnosis and quick optimized resume: `EVOLINK_FREE_MODEL`
- Claude deep refinement: `EVOLINK_PAID_MODEL`, configured but not used until V2

Recommended long-term task split:

- Text cleanup: Gemini Flash Lite
- Resume structure extraction: Gemini Flash Lite
- JD capability extraction: Gemini Flash Lite
- Complete quick resume optimization: Gemini Flash Lite
- Paid deep refinement: Claude Sonnet 5
- Recruiter greeting and platform profile copy: Gemini for free/quick, Claude for paid/deep

## Prompt Design

The V1 prompt should follow the `resume-content-upgrade-word` content strategy, adapted for website JSON output instead of Word DOCX.

Core rules:

- Preserve hard facts: name, school, degree, company, dates, certificates, awards, patents, role titles unless the user explicitly changes them
- Do not invent AI projects or AI skills
- Do not add tools or skills not supported by the original resume
- Rewrite weak expressions such as “负责 / 参与 / 熟悉” into concrete “context + action + result” language
- Use the target role or JD to extract 2-4 capability tags
- For social candidates, include core advantages; for campus candidates, keep education early and avoid a standalone advantage section by default
- Default output is a real delivery version: conservative facts, no unsupported metrics
- If the user enables the advanced switch, the model may add reasonable quantified facts but must list them under “requires confirmation”
- Avoid empty phrases such as “完整闭环能力”, “能力沉淀”, “可演示、可评估、可迭代”

Required model output should be strict JSON:

```json
{
  "mode": "guest_partial | full_free",
  "candidate_type": "campus | experienced | unknown",
  "target_role": "string",
  "jd_used": true,
  "overall_score": 0,
  "diagnosis": {
    "summary": "string",
    "top_issues": ["string"],
    "section_issues": [
      { "section": "string", "issue": "string", "suggestion": "string" }
    ]
  },
  "optimized_resume": {
    "personal_info": "string",
    "core_advantages": ["string"],
    "education": ["string"],
    "work_experience": [
      {
        "title": "string",
        "period": "string",
        "bullets": ["string"]
      }
    ],
    "project_experience": [
      {
        "title": "string",
        "description": "string",
        "bullets": ["string"]
      }
    ],
    "skills": [
      { "category": "string", "items": ["string"] }
    ]
  },
  "modification_notes": ["string"],
  "facts_to_confirm": ["string"],
  "sample_rewrite": {
    "before": "string",
    "after": "string"
  }
}
```

For guest partial results, `optimized_resume` may be omitted or only include a sample rewrite.

## Architecture

### New Page

Add a landing/console-style page for the feature, likely:

- `/[locale]/resume-optimizer`

It should be a usable tool screen, not a marketing-only landing page.

Page layout:

- Header/title area with concise promise
- Input panel with target role, optional JD, resume text, file upload, advanced confirmation toggle
- Submit button
- Result panel with diagnosis and optimized resume sections
- Login CTA for guest partial results

### Client Component

Create a focused client component for the interactive form and result state.

Responsibilities:

- Collect inputs
- Upload file for extraction or send direct text
- Show parsing errors and paste fallback
- Call generation API
- Render loading/error/success states
- Open sign-in modal or link when guest result is gated

### API Routes

Add two V1 routes:

1. `POST /api/resume/parse`

Accepts multipart file upload.

Returns:

```json
{ "text": "extracted resume text", "filename": "..." }
```

Supported file types:

- `.docx`
- `.pdf`

If parsing fails, return a friendly error and let UI fall back to paste.

2. `POST /api/resume/optimize`

Accepts:

```json
{
  "resumeText": "string",
  "targetRole": "string",
  "jdText": "string optional",
  "allowInferredMetrics": false
}
```

Server responsibilities:

- Validate required fields
- Determine signed-in user via existing auth helpers
- Determine guest/logged-in access mode
- Call Evolink with `EVOLINK_FREE_MODEL`
- Validate/repair JSON response if needed
- Return shaped result
- Record free usage if logged-in or guest cookie if guest

### Data Persistence

V1 can be implemented with minimal persistence:

- Guest trial: cookie-based tracking
- Logged-in free usage: simple DB table or config-compatible usage table

Recommended V1 DB table:

`resume_optimization_usage`

Fields:

- `id`
- `userId` nullable for guest if needed
- `guestId` nullable
- `type`: `guest_partial | free_full`
- `model`
- `targetRole`
- `createdAt`

This table prevents the free logged-in experience from being reused indefinitely and gives product analytics later.

If we want to avoid migrations in the first internal demo, we can temporarily track logged-in usage in local storage, but production V1 should use DB.

## File Parsing

Use server-side parsing.

Expected approach:

- DOCX: extract document text using a Node package or bundled runtime library
- PDF: extract text using a Node package or a lightweight local parser
- Keep parsed text only in memory for V1 unless result history is explicitly added
- Enforce file size limit, recommended 10 MB
- Reject unsupported file types clearly

## Error Handling

User-facing errors should be plain and actionable:

- Missing target role: “请选择或填写目标岗位”
- Missing resume: “请粘贴简历文本，或上传 Word/PDF 简历”
- Parse failed: “文件解析失败，你可以直接粘贴简历文本继续”
- AI timeout: “生成时间较长，请稍后重试”
- Invalid AI JSON: “生成结果格式异常，请重试”
- Free usage exhausted: “你的免费完整体验已使用，深度精修将在下一版开放”

Backend should not log resume full text in production.

## Privacy and Safety

- API key stays server-side
- Do not store uploaded resume files in V1
- Avoid logging raw resume/JD text
- Add copy explaining that AI may make mistakes and users should verify facts before delivery
- Facts inferred by AI must be shown separately under confirmation notes when the advanced switch is enabled

## Testing

Minimum tests/checks:

- Guest partial flow returns no full resume
- Logged-in free flow returns full diagnosis and optimized resume
- Target role is required
- JD is optional
- Advanced inferred metrics switch affects prompt and output expectations
- DOCX/PDF parse failure returns fallback-safe error
- Evolink errors surface as readable messages
- API key is not exposed to client bundle

Manual QA:

- Paste Chinese resume without JD
- Paste Chinese resume with JD
- Upload DOCX
- Upload PDF
- Try as guest twice
- Try as logged-in user after free usage is consumed

## V2 Backlog

- Claude Sonnet 5 deep refinement
- Credits/payment integration
- Word DOCX export with verified layout
- Recruiter greeting generation
- Recruitment platform profile optimization
- Multiple resume versions per target role
- Admin prompt management
- Full before/after diff
- Resume history and deletion controls
