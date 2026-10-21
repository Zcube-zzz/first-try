import { ResumeLayoutTemplate, ResumeVisualTheme } from './types';

export const RESUME_LAYOUT_TEMPLATES: ResumeLayoutTemplate[] = [
  {
    id: 'ats-clean',
    title: 'ATS 极简黑',
    description: '单栏、黑白、信息密度适中，优先保证 ATS 识别和 HR 快速扫描。',
    bestFor: '通用投递、传统行业、需要 ATS 识别的岗位',
    structure: 'single-column',
    previewSections: [
      '基本信息',
      '职业摘要',
      '工作经历',
      '项目经历',
      '教育背景',
    ],
    sampleBlocks: [
      {
        title: '基本信息',
        lines: ['姓名 XXXX · 手机 XXXX · 邮箱 XXXX · 城市 XXXX'],
      },
      {
        title: '职业摘要',
        lines: ['X 年 XXXX 方向经验，熟悉 XXXX，能独立负责 XXXX。'],
      },
      {
        title: '工作经历',
        lines: [
          '20XX.XX - 20XX.XX · XXXX 公司 · XXXX 岗位',
          '负责 XXXX，通过 XXXX 方法推动 XXXX，结果提升 XXXX。',
        ],
      },
      {
        title: '项目经历',
        lines: [
          'XXXX 项目 · 面向 XXXX 场景',
          '梳理 XXXX 问题，完成 XXXX 方案，并沉淀 XXXX。',
        ],
      },
      { title: '教育背景', lines: ['20XX - 20XX · XXXX 大学 · XXXX 专业'] },
    ],
  },
  {
    id: 'business-professional',
    title: '商务专业版',
    description: '强调职业摘要、核心优势和关键成果，适合正式、稳重的求职表达。',
    bestFor: '运营、职能、金融、咨询、传统企业岗位',
    structure: 'single-column',
    previewSections: [
      '个人信息',
      '核心优势',
      '工作经历',
      '关键成果',
      '教育背景',
    ],
    sampleBlocks: [
      {
        title: '个人信息',
        lines: ['XXXX · XXXX 岗位方向 · XXXX 城市 · XXXX 联系方式'],
      },
      {
        title: '核心优势',
        lines: [
          'XXXX 业务理解 · XXXX 项目推进 · XXXX 数据分析 · XXXX 沟通协作',
        ],
      },
      {
        title: '工作经历',
        lines: [
          '20XX.XX - 20XX.XX · XXXX 集团 · XXXX 职位',
          '围绕 XXXX 目标，协调 XXXX 资源，完成 XXXX 交付。',
        ],
      },
      {
        title: '关键成果',
        lines: ['推动 XXXX 流程优化，使 XXXX 指标提升/降低 XXXX。'],
      },
      { title: '教育背景', lines: ['XXXX 大学 · XXXX 专业 · 20XX 届'] },
    ],
  },
  {
    id: 'product-results',
    title: '产品成果版',
    description: '单栏突出项目背景、行动和结果，让 HR 更快定位你的业务价值。',
    bestFor: '产品经理、增长、运营、项目管理和 AI 岗位',
    structure: 'single-column',
    previewSections: [
      '个人信息',
      '核心能力',
      '项目经历',
      '数据成果',
      '工作经历',
    ],
    sampleBlocks: [
      {
        title: '个人信息',
        lines: ['XXXX · 产品/增长方向 · 邮箱 XXXX · 手机 XXXX'],
      },
      {
        title: '核心能力',
        lines: ['需求分析 · 用户研究 · 数据分析 · 项目推进 · XXXX'],
      },
      {
        title: '项目经历',
        lines: [
          'XXXX 项目 · 20XX.XX - 20XX.XX',
          '定位 XXXX 问题，设计 XXXX 路径，推动 XXXX 上线。',
        ],
      },
      {
        title: '数据成果',
        lines: [
          '转化率提升 XXXX · 用户规模 XXXX · 成本降低 XXXX · 收入影响 XXXX',
        ],
      },
      {
        title: '工作经历',
        lines: [
          'XXXX 公司 · XXXX 产品经理',
          '负责 XXXX 模块，从 0 到 1 推动 XXXX。',
        ],
      },
    ],
  },
];

export const RESUME_VISUAL_THEMES: ResumeVisualTheme[] = [
  {
    id: 'clean-white',
    title: '纯净白',
    description: '克制、清爽、最适合通用投递和 ATS 识别。',
    accentColor: '#111827',
    background: '#ffffff',
    swatches: ['#ffffff', '#f3f4f6', '#111827'],
  },
  {
    id: 'business-blue',
    title: '商务蓝',
    description: '稳重可信，适合产品、运营、职能和商务岗位。',
    accentColor: '#2563eb',
    background: '#f8fbff',
    swatches: ['#f8fbff', '#dbeafe', '#2563eb'],
  },
  {
    id: 'intelligent-gray',
    title: '智能科技灰',
    description: '更有智能产品感，适合 AI、技术、数据相关岗位。',
    accentColor: '#475569',
    background: '#f8fafc',
    swatches: ['#f8fafc', '#e2e8f0', '#475569'],
  },
];

export function getResumeLayoutTemplate(id?: string) {
  return (
    RESUME_LAYOUT_TEMPLATES.find((template) => template.id === id) ??
    RESUME_LAYOUT_TEMPLATES[0]
  );
}

export function getResumeVisualTheme(id?: string) {
  return (
    RESUME_VISUAL_THEMES.find((theme) => theme.id === id) ??
    RESUME_VISUAL_THEMES[0]
  );
}
