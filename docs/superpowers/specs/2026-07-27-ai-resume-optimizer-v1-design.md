# AI 简历优化功能 V1 产品设计文档

日期：2026-07-27
状态：待用户确认

## 目标

在现有 ShipAny SaaS 脚手架中，实现第一版可用的 AI 简历优化功能。

V1 的目标不是一次性做成完整 Resume Worded，而是先跑通核心体验：用户提供简历，选择目标岗位，可选粘贴 JD，然后获得一份完整简历诊断和一份基础版优化简历。

V1 暂不做付费、积分扣费、Word 导出、招聘平台打招呼话术、招聘平台个人资料优化。这些能力放到 V2。

## 产品范围

### V1 包含

- 支持用户粘贴简历文本
- 支持上传 Word / PDF 简历
- 文件解析失败时，引导用户手动粘贴简历文本
- 目标岗位必填：用户必须选择或填写一个求职目标岗位
- JD 可选，但页面强提示“上传 JD 可获得更精准优化”
- 游客可体验 1 次，但只展示部分诊断
- 登录用户可获得 1 次完整免费体验
- 登录免费体验包含：完整简历诊断 + Gemini 快速优化版简历
- 结果页展示：完整优化简历、修改说明、需本人确认的事实或量化指标
- 接入 Evolink 模型调用
- 内置简历优化 prompt，参考当前 `resume-content-upgrade-word` 中“只做内容优化”的规则

### V1 不包含

- 支付系统
- 积分扣费
- Claude 深度精修付费流程
- Word DOCX 导出
- PDF 导出
- 多版本简历历史
- 招聘平台打招呼话术生成
- BOSS / 智联 / 猎聘 / LinkedIn 个人资料优化
- 后台 prompt 编辑器
- 复杂的左右对比 diff 视图

## 用户流程

1. 用户进入简历优化页面
2. 用户提供简历内容，方式二选一：
   - 直接粘贴简历文本
   - 上传 `.docx` 或 `.pdf` 文件
3. 如果文件解析失败，页面提示“解析失败，可直接粘贴简历文本继续”
4. 用户选择或填写目标岗位，目标岗位为必填项
5. 用户可选粘贴 JD，页面提示 JD 会提升匹配质量
6. 用户选择是否允许 AI 补充“需本人确认”的合理量化指标，默认关闭
7. 用户点击生成
8. 后端判断用户身份和权益：
   - 游客：返回部分诊断，不返回完整优化简历
   - 登录用户且未使用免费完整体验：返回完整诊断 + Gemini 快速优化版简历
   - 登录用户且已使用免费完整体验：返回 V1 阶段的引导提示，告知深度精修将在后续版本开放
9. 前端根据返回结果展示诊断和优化简历

## 权益规则

### 游客

- 每个浏览器可体验 1 次
- 使用 cookie 记录游客体验状态
- 游客只展示部分诊断，不展示完整优化简历
- 游客体验要能体现价值，但主要目标是引导登录

游客结果包含：

- 总体评分或等级
- Top 3 简历问题
- 1 条示例改写
- 登录引导按钮

### 登录免费用户

- 每个账号可获得 1 次完整免费体验
- 使用 Gemini 快速模型
- 返回完整诊断和完整优化简历

登录用户结果包含：

- 总体诊断
- 分模块问题清单
- 完整优化版简历
- 修改说明
- 需本人确认的事实或量化指标

### 付费能力

V1 不实现付费能力。

V2 再考虑：

- Claude Sonnet 5 深度精修
- ShipAny credits 积分系统
- 支付和积分包
- Word 导出
- 打招呼话术与平台资料优化

## 模型策略

V1 通过服务端调用 Evolink，API key 只保存在环境变量中，不暴露到浏览器。

环境变量：

- `EVOLINK_API_KEY`
- `EVOLINK_BASE_URL`
- `EVOLINK_FREE_MODEL`
- `EVOLINK_PAID_MODEL`

当前本地开发配置：

- 免费模型：`gemini-3.5-flash-lite`
- 付费模型预留：`claude-sonnet-5`
- Base URL：`https://direct.evolink.ai`

V1 实际使用：

- 游客部分诊断：`EVOLINK_FREE_MODEL`
- 登录用户完整诊断 + 快速优化简历：`EVOLINK_FREE_MODEL`
- Claude 深度精修：V1 只配置，不调用

长期任务拆分建议：

- 文本清洗：Gemini Flash Lite
- 简历结构化抽取：Gemini Flash Lite
- JD 能力标签提取：Gemini Flash Lite
- 免费快速优化版简历：Gemini Flash Lite
- 付费深度精修版简历：Claude Sonnet 5
- 招聘平台打招呼话术：免费版 Gemini，付费版 Claude
- 招聘平台个人资料优化：免费版 Gemini，付费版 Claude

## Prompt 设计

V1 prompt 参考 `resume-content-upgrade-word` 的内容优化策略，但输出形式改为网站可渲染的结构化 JSON，不做 Word 排版。

核心规则：

- 保留硬事实：姓名、学校、学历、公司、任职时间、证书、奖项、专利、岗位名称等不得乱改
- 不新增用户原简历中没有出现过的 AI 项目或 AI 技能
- 不因为 JD 出现某工具，就自动给用户添加该技能
- 将“负责 / 参与 / 熟悉”等弱表达改写成“场景 + 动作 + 结果”
- 根据目标岗位或 JD 提炼 2-4 个能力标签
- 社招用户默认包含“核心优势”
- 校招用户默认教育背景前置，不强行生成独立“核心优势”
- 默认输出为真实投递版：只做表达优化，不补充无依据数字
- 如果用户开启高级选项，AI 可补充合理量化指标，但必须列入“需本人确认”
- 避免空话，如“完整闭环能力”“能力沉淀”“可演示、可评估、可迭代”

模型必须返回严格 JSON：

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

游客部分诊断结果中，可以不返回 `optimized_resume`，或只返回 `sample_rewrite`。

## 页面设计

新增一个简历优化工具页，建议路径：

- `/[locale]/resume-optimizer`

这个页面应该是工具页面，不是纯营销落地页。

页面结构：

- 顶部标题区：一句话说明功能，例如“上传简历，生成面向目标岗位的优化版本”
- 输入区：
  - 目标岗位选择 / 输入
  - JD 粘贴框，可选
  - 简历文本粘贴框
  - Word / PDF 上传入口
  - “允许补充需本人确认的量化指标”开关
  - 生成按钮
- 结果区：
  - 简历诊断
  - 优化版简历
  - 修改说明
  - 需确认事实
  - 游客登录引导

## 前端组件设计

新增一个聚焦的客户端组件处理表单和结果状态。

组件职责：

- 收集用户输入
- 处理文件上传和解析
- 解析失败时展示粘贴文本兜底
- 调用生成接口
- 渲染加载、错误、成功状态
- 游客部分结果后展示登录引导
- 登录用户完整结果后展示完整优化简历

结果页不做复杂 diff，先做“完整简历 + 修改说明 + 需确认事实”。

## API 设计

### `POST /api/resume/parse`

用于解析上传的 Word / PDF 文件。

请求：

- `multipart/form-data`
- 字段名：`file`

支持：

- `.docx`
- `.pdf`

返回：

```json
{
  "text": "解析后的简历文本",
  "filename": "resume.docx"
}
```

如果解析失败：

```json
{
  "code": -1,
  "message": "文件解析失败，你可以直接粘贴简历文本继续"
}
```

### `POST /api/resume/optimize`

用于生成诊断和优化简历。

请求：

```json
{
  "resumeText": "string",
  "targetRole": "string",
  "jdText": "string | null",
  "allowInferredMetrics": false
}
```

后端职责：

- 校验目标岗位必填
- 校验简历文本必填
- 判断当前用户是否登录
- 判断游客或登录用户权益
- 构造 prompt
- 调用 Evolink
- 校验模型返回 JSON
- 返回结构化结果
- 记录游客体验或登录用户免费体验状态

## 数据存储

V1 建议增加一张轻量使用记录表：

`resume_optimization_usage`

字段建议：

- `id`
- `userId`：登录用户 ID，可为空
- `guestId`：游客 ID，可为空
- `type`：`guest_partial | free_full`
- `model`
- `targetRole`
- `createdAt`

用途：

- 防止游客重复刷体验
- 防止登录用户重复使用完整免费体验
- 后续做产品分析和转化漏斗

如果只做内部 demo，可以先用 cookie + localStorage 做临时限制；但正式 V1 应该使用数据库记录。

## 文件解析

文件解析在服务端完成。

要求：

- 最大文件大小建议 10 MB
- 只接受 `.docx` 和 `.pdf`
- 不在 V1 存储原始文件
- 解析出的文本只用于本次生成
- 解析失败时不阻塞流程，前端引导用户手动粘贴文本

实现建议：

- DOCX：使用 Node 侧文档解析库提取文本
- PDF：使用 Node 侧 PDF 文本解析库提取文本
- 解析逻辑独立封装，方便后续替换

## 错误处理

用户看到的错误要直接、可操作：

- 未填写目标岗位：`请选择或填写目标岗位`
- 未提供简历：`请粘贴简历文本，或上传 Word/PDF 简历`
- 文件解析失败：`文件解析失败，你可以直接粘贴简历文本继续`
- AI 生成超时：`生成时间较长，请稍后重试`
- AI 返回格式异常：`生成结果格式异常，请重试`
- 免费完整体验已用完：`你的免费完整体验已使用，深度精修将在下一版开放`

生产环境后端不记录完整简历和 JD 原文。

## 隐私与安全

- Evolink API key 只在服务端环境变量中使用
- 浏览器端不得出现 API key
- V1 不存储上传的原始简历文件
- 默认不记录完整简历原文
- 页面提示用户：AI 结果可能有误，投递前请自行核对事实
- 开启“补充需确认量化指标”后，所有推断内容必须单独列到“需本人确认”

## 测试范围

最低测试项：

- 游客只返回部分诊断，不返回完整简历
- 游客第二次体验被拦截或引导登录
- 登录用户第一次返回完整诊断和完整优化简历
- 登录用户第二次完整体验被拦截
- 目标岗位为空时返回错误
- JD 为空时仍可生成
- 开启“补充需确认量化指标”后，结果包含 `facts_to_confirm`
- DOCX 上传解析成功
- PDF 上传解析成功
- 文件解析失败时可手动粘贴继续
- Evolink 错误能返回可读提示
- API key 不进入前端 bundle

人工验收用例：

- 粘贴中文简历，无 JD
- 粘贴中文简历，有 JD
- 上传 DOCX 简历
- 上传 PDF 简历
- 游客连续尝试两次
- 登录用户使用完整免费体验后再次尝试

## V2 待办

- Claude Sonnet 5 深度精修
- ShipAny credits 积分系统
- 支付和积分包
- Word DOCX 导出
- PDF 导出
- 招聘平台打招呼话术
- 招聘平台个人资料优化
- 针对不同岗位生成多个简历版本
- 后台 prompt 管理
- 完整左右对比 diff
- 简历历史记录和删除控制
