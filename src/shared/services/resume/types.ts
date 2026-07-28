export type ResumeLocale = 'zh' | 'en';

export type ResumeMatchLevel = 'low' | 'medium' | 'high';

export interface ResumeRequestContext {
  resumeText: string;
  targetRole?: string;
  jdText?: string;
  templateId?: string;
  styleId?: string;
  locale?: ResumeLocale;
}

export interface ResumeSectionScores {
  keywords: number;
  experience: number;
  ats: number;
  readability: number;
}

export interface ResumeDiagnosis {
  score: number;
  level: ResumeMatchLevel;
  summary: string;
  keywordMatches: string[];
  keywordGaps: string[];
  strengths: string[];
  issues: string[];
  suggestions: string[];
  sectionScores: ResumeSectionScores;
}

export interface ResumeOptimizationResult {
  title: string;
  summary: string;
  rewrittenResume: string;
  changeNotes: string[];
  factsToConfirm: string[];
  diagnosis: ResumeDiagnosis;
}

export interface ResumeExtractionResult {
  text: string;
  sourceType: 'text' | 'pdf' | 'docx' | 'image';
  confidence: number;
  warnings: string[];
  fileName?: string;
}

export interface ResumeTemplate {
  id: string;
  title: string;
  description: string;
  instruction: string;
}

export interface ResumeRewriteStyle {
  id: string;
  title: string;
  description: string;
  instruction: string;
}
