import { ResumeRewriteStyle, ResumeTemplate } from './types';

export const RESUME_TEMPLATES: ResumeTemplate[] = [
  {
    id: 'internet-experienced',
    title: '互联网社招',
    description: '突出真实业务场景、产品交付、跨团队协作和迭代结果。',
    instruction:
      '围绕目标岗位组织互联网社招经历，突出本人实际承担的产品工作、协作和交付，不编造 AI 能力或业绩数字。',
    strategy:
      '梳理需求、方案、交付和迭代证据；缺少数据时使用待确认槽位，由本人填写。',
    recommendedLayoutId: 'business-professional',
    recommendedStyleId: 'achievement-focused',
    recommendedVisualThemeId: 'business-blue',
  },
  {
    id: 'campus',
    title: '校招 / 实习',
    description: '突出教育、实习、项目、竞赛和校园经历。',
    instruction:
      '使用校招简历结构，优先呈现教育背景、实习经历、项目经历、技能和校园成果。',
    strategy:
      '优先呈现教育背景、实习和项目证据，突出学习能力与岗位潜力，避免夸大校园经历。',
    recommendedLayoutId: 'ats-clean',
    recommendedStyleId: 'fact-preserving',
    recommendedVisualThemeId: 'clean-white',
  },
  {
    id: 'experienced',
    title: '社招通用',
    description: '突出职业摘要、核心优势、工作经历和业务成果。',
    instruction:
      '使用社招简历结构，强调职业摘要、核心能力、工作经历、项目成果和可量化影响。',
    strategy:
      '围绕职业摘要、核心优势和业务成果组织内容，减少与目标岗位无关的经历。',
    recommendedLayoutId: 'business-professional',
    recommendedStyleId: 'enterprise-cn',
    recommendedVisualThemeId: 'business-blue',
  },
  {
    id: 'product-manager',
    title: '产品经理',
    description: '突出需求分析、用户理解、数据指标、项目推进和业务结果。',
    instruction:
      '使用产品经理简历结构，强化需求洞察、数据分析、跨团队协作、项目推进和业务指标。',
    strategy:
      '强化用户理解、需求分析、项目推进、数据结果和业务闭环，优先使用真实指标。',
    recommendedLayoutId: 'product-results',
    recommendedStyleId: 'achievement-focused',
    recommendedVisualThemeId: 'business-blue',
  },
  {
    id: 'ai-product-manager',
    title: 'AI 产品经理',
    description: '突出 AI 理解、Agent/Workflow、模型应用和工程协作。',
    instruction:
      '使用 AI 产品经理简历结构，突出 LLM、Agent、Workflow、Prompt、模型应用和工程协作，但不得编造 AI 经历。',
    strategy:
      '强调真实 AI 场景、模型能力边界、数据闭环和产品落地，不堆砌 AI 名词。',
    recommendedLayoutId: 'product-results',
    recommendedStyleId: 'achievement-focused',
    recommendedVisualThemeId: 'intelligent-gray',
  },
  {
    id: 'engineering',
    title: '技术 / 研发',
    description: '突出技术栈、系统贡献、复杂度、性能和稳定性。',
    instruction:
      '使用技术岗简历结构，根据实际方向区分软件、硬件、测试等内容；软件突出模块和系统贡献，硬件突出已有的装配、电气连接、调试校准、通信联调、测试与试产支持，不因岗位名称补造设计或研发经历。',
    strategy:
      '写清实际技术对象、工具方法、负责环节、交付记录和可验证结果；从已有工作挖掘细节，缺失的工作量数据由本人填写。',
    recommendedLayoutId: 'ats-clean',
    recommendedStyleId: 'fact-preserving',
    recommendedVisualThemeId: 'intelligent-gray',
  },
  {
    id: 'traditional',
    title: '国企 / 银行 / 传统企业',
    description: '突出专业性、规范表达、稳定性和正式的项目经历。',
    instruction:
      '使用稳重规范的中文简历结构，强调教育背景、正式工作内容、专业能力和可验证成果，避免互联网黑话。',
    strategy:
      '使用稳重、规范的表达，突出专业性、责任边界、正式项目和稳定交付能力。',
    recommendedLayoutId: 'business-professional',
    recommendedStyleId: 'enterprise-cn',
    recommendedVisualThemeId: 'clean-white',
  },
  {
    id: 'career-change',
    title: '转行求职',
    description: '突出可迁移能力、目标岗位相关性和经历重构。',
    instruction:
      '围绕目标岗位重组已有经历，强调可迁移能力和真实相关项目，弱化无关内容，不得编造目标岗位经验。',
    strategy:
      '解释过去经历如何支持目标岗位，突出可迁移能力，弱化无关经历，不硬编目标岗位经验。',
    recommendedLayoutId: 'ats-clean',
    recommendedStyleId: 'fact-preserving',
    recommendedVisualThemeId: 'clean-white',
  },
  {
    id: 'consulting-functions',
    title: '咨询 / 管培 / 职能岗位',
    description: '突出结构化分析、项目协作、沟通表达和正式业务结果。',
    instruction:
      '使用结构化、正式的中文表达，强调问题分析、项目推进、沟通协作和业务结果。',
    strategy:
      '突出结构化分析、跨团队协作、沟通表达和项目结果，减少过度技术化或花哨表达。',
    recommendedLayoutId: 'business-professional',
    recommendedStyleId: 'enterprise-cn',
    recommendedVisualThemeId: 'business-blue',
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
    RESUME_TEMPLATES.find((template) => template.id === 'experienced')!
  );
}

export function getResumeRewriteStyle(id?: string) {
  return (
    RESUME_REWRITE_STYLES.find((style) => style.id === id) ??
    RESUME_REWRITE_STYLES[0]
  );
}
