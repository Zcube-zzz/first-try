export type ResumeLocale = 'zh' | 'en';

export type ResumeMatchLevel = 'low' | 'medium' | 'high';

export type ResumeIssuePriority = 'must' | 'recommended' | 'optional';

export interface ResumeRequestContext {
  resumeText: string;
  targetRole?: string;
  jdText?: string;
  templateId?: string;
  styleId?: string;
  layoutTemplateId?: string;
  visualThemeId?: string;
  locale?: ResumeLocale;
  rewriteScope?: 'full' | 'unlocked' | 'paragraph';
  draftTitle?: string;
  paragraphs?: ResumeParagraphInput[];
  slots?: ResumeSlot[];
}

export interface ResumeParagraphInput {
  id: string;
  text: string;
}

export type ResumeParagraphState = 'Original' | 'AI_Optimized' | 'User_Edited';

export interface ResumeParagraph extends ResumeParagraphInput {
  originalText: string;
  state: ResumeParagraphState;
  isLocked: boolean;
  revision: number;
}

export interface ResumeSlot {
  id: string;
  sourceId?: string;
  label: string;
  prompt: string;
  fallbackText: string;
}

export interface ResumeEditorState {
  paragraphs: ResumeParagraph[];
  slots: ResumeSlot[];
}

export interface ResumeSectionScores {
  keywords: number;
  experience: number;
  ats: number;
  readability: number;
}

export interface ResumeFitConclusion {
  currentDirection: string;
  targetNeeds: string;
  mainGap: string;
}

export interface ResumeDiagnosisIssue {
  title: string;
  description: string;
  evidence: string;
  impact: string;
  suggestion: string;
  priority: ResumeIssuePriority;
}

export interface ResumeKeywordGapDetail {
  keyword: string;
  reason: string;
  evidence: string;
}

export type ResumeChangeType =
  | 'expression'
  | 'structure'
  | 'keyword'
  | 'quantification'
  | 'focus'
  | 'deletion'
  | 'risk';

export interface ResumeOptimizationChange {
  original: string;
  revised: string;
  type: ResumeChangeType;
  reason: string;
  needsConfirmation: boolean;
}

export type ResumeConfirmationCategory =
  | 'metric'
  | 'skill'
  | 'scope'
  | 'credential'
  | 'experience'
  | 'evidence';

export interface ResumeConfirmationItem {
  category: ResumeConfirmationCategory;
  item: string;
  reason: string;
}

export interface ResumeDiagnosis {
  score: number;
  level: ResumeMatchLevel;
  summary: string;
  fitConclusion: ResumeFitConclusion;
  issueDetails: ResumeDiagnosisIssue[];
  keywordGapDetails: ResumeKeywordGapDetail[];
  keywordMatches: string[];
  keywordGaps: string[];
  strengths: string[];
  issues: string[];
  suggestions: string[];
  sectionScores: ResumeSectionScores;
}

export interface ResumeOptimizationResult {
  generationStatus: 'success' | 'fallback';
  paragraphs: ResumeParagraphInput[];
  slots: ResumeSlot[];
  title: string;
  summary: string;
  rewrittenResume: string;
  changes: ResumeOptimizationChange[];
  confirmationItems: ResumeConfirmationItem[];
  changeNotes: string[];
  factsToConfirm: string[];
  diagnosis: ResumeDiagnosis;
}

export interface ResumeExtractionResult {
  text: string;
  sourceType: 'text' | 'pdf' | 'docx';
  confidence: number;
  warnings: string[];
  fileName?: string;
}

export interface ResumeTemplate {
  id: string;
  title: string;
  description: string;
  instruction: string;
  strategy: string;
  recommendedLayoutId: string;
  recommendedStyleId: string;
  recommendedVisualThemeId: string;
}

export interface ResumeRewriteStyle {
  id: string;
  title: string;
  description: string;
  instruction: string;
}

export interface ResumeLayoutTemplate {
  id: string;
  title: string;
  description: string;
  bestFor: string;
  structure: 'single-column';
  previewSections: string[];
  sampleBlocks: ResumeSampleBlock[];
}

export interface ResumeSampleBlock {
  title: string;
  lines: string[];
}

export interface ResumeVisualTheme {
  id: string;
  title: string;
  description: string;
  accentColor: string;
  background: string;
  swatches: string[];
}
