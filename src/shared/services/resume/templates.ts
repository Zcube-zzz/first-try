import { ResumeRewriteStyle, ResumeTemplate } from './types';

export const RESUME_TEMPLATES: ResumeTemplate[] = [
  {
    id: 'campus',
    title: '校招 / 实习',
    description: '突出教育、实习、项目、竞赛和校园经历。',
    instruction:
      '使用校招简历结构，优先呈现教育背景、实习经历、项目经历、技能和校园成果。',
  },
  {
    id: 'experienced',
    title: '社招通用',
    description: '突出职业摘要、核心优势、工作经历和业务成果。',
    instruction:
      '使用社招简历结构，强调职业摘要、核心能力、工作经历、项目成果和可量化影响。',
  },
  {
    id: 'product-manager',
    title: '产品经理',
    description: '突出需求分析、数据指标、项目推进和商业结果。',
    instruction:
      '使用产品经理简历结构，强化需求洞察、数据分析、跨团队协作、项目推进和业务指标。',
  },
  {
    id: 'ai-product-manager',
    title: 'AI 产品经理',
    description: '突出 AI 理解、Agent/Workflow、模型应用和工程协作。',
    instruction:
      '使用 AI 产品经理简历结构，突出 LLM、Agent、Workflow、Prompt、模型应用和工程协作，但不得编造 AI 经历。',
  },
  {
    id: 'engineering',
    title: '技术 / 研发',
    description: '突出技术栈、系统贡献、复杂度、性能和稳定性。',
    instruction:
      '使用技术岗简历结构，强调技术栈、系统设计、工程复杂度、性能优化和稳定性贡献。',
  },
];

export const RESUME_REWRITE_STYLES: ResumeRewriteStyle[] = [
  {
    id: 'fact-preserving',
    title: '保守事实型',
    description: '只优化表达，不新增未经证实的信息。',
    instruction:
      '保持事实克制，只重组和润色用户已提供的信息，所有推断都进入需要用户确认列表。',
  },
  {
    id: 'ats-friendly',
    title: 'ATS 友好型',
    description: '强化关键词、结构和机器可读性。',
    instruction:
      '提升 ATS 可读性，补齐目标岗位关键词，使用清晰标题、动词开头和标准化技能表达。',
  },
  {
    id: 'achievement-focused',
    title: '成果强化型',
    description: '把弱表达改成背景、动作、结果。',
    instruction:
      '采用成果强化型表达，把职责改成动作和结果，优先使用量化指标；缺少数据时写入需要用户确认列表。',
  },
  {
    id: 'enterprise-cn',
    title: '中文大厂型',
    description: '表达更职业化，突出复杂项目和跨团队推进。',
    instruction:
      '使用中文大厂常见简历表达，突出复杂业务场景、跨团队协作、项目推进和业务影响。',
  },
];

export function getResumeTemplate(id?: string) {
  return (
    RESUME_TEMPLATES.find((template) => template.id === id) ??
    RESUME_TEMPLATES[1]
  );
}

export function getResumeRewriteStyle(id?: string) {
  return (
    RESUME_REWRITE_STYLES.find((style) => style.id === id) ??
    RESUME_REWRITE_STYLES[0]
  );
}
