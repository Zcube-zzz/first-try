import { RESUME_LAYOUT_TEMPLATES } from './visual-templates';

const sectionNames = new Set([
  ...RESUME_LAYOUT_TEMPLATES.flatMap((layout) => layout.previewSections),
  '核心能力',
  '学历信息',
  '实习经历',
  '专业技能',
  '技能',
  '证书与奖项',
  '校园经历',
  'Summary',
  'Experience',
  'Work Experience',
  'Projects',
  'Education',
  'Skills',
]);

export type ResumeLineKind = 'name' | 'section' | 'subheading' | 'body';
export type ResumeDensity = 'relaxed' | 'standard' | 'compact' | 'two-page';
type ResumeLayoutLine = { text: string; kind: ResumeLineKind };

const standard = {
  fontPt: 10,
  lineHeightPt: 13.5,
  marginTopMm: 16,
  marginBottomMm: 16,
  marginLeftMm: 18,
  marginRightMm: 18,
  paragraphAfterPt: 3,
  sectionBeforePt: 12,
  sectionAfterPt: 4,
  titlePt: 19,
  titleAfterPt: 10,
  sectionPt: 12.5,
  subheadingPt: 10.5,
  subheadingBeforePt: 5.5,
  subheadingAfterPt: 2,
};

const anchors = [
  {
    lines: 25,
    fontPt: 11,
    lineHeightPt: 18,
    afterPt: 6,
    marginMm: 22,
    sideMm: 23,
    sectionBeforePt: 18,
  },
  {
    lines: 55,
    fontPt: 10.5,
    lineHeightPt: 15.5,
    afterPt: 4.5,
    marginMm: 17,
    sideMm: 17,
    sectionBeforePt: 12,
  },
  {
    lines: 67,
    fontPt: 10,
    lineHeightPt: 14,
    afterPt: 3.5,
    marginMm: 15,
    sideMm: 15,
    sectionBeforePt: 9,
  },
  {
    lines: 83,
    fontPt: 9.5,
    lineHeightPt: 12.65,
    afterPt: 2.25,
    marginMm: 12.5,
    sideMm: 12.7,
    sectionBeforePt: 9,
  },
  {
    lines: 95,
    fontPt: 9.5,
    lineHeightPt: 12.5,
    afterPt: 2,
    marginMm: 12.5,
    sideMm: 12.7,
    sectionBeforePt: 9,
  },
];

export function getResumePageProfile(
  estimatedLines: number,
  templateId?: string
) {
  if (selectResumeDensity(estimatedLines, templateId) === 'two-page')
    return { ...standard };
  const end = anchors.findIndex((point) => estimatedLines <= point.lines);
  const to = anchors[Math.max(0, end)];
  const from = anchors[Math.max(0, end - 1)];
  const ratio =
    from === to ? 0 : (estimatedLines - from.lines) / (to.lines - from.lines);
  const interpolate = (key: Exclude<keyof typeof to, 'lines'>) =>
    Math.round((from[key] + (to[key] - from[key]) * ratio) * 20) / 20;
  // Word stores font sizes in half-points; all other dimensions interpolate continuously.
  const fontPt = Math.round(interpolate('fontPt') * 2) / 2;
  return {
    ...standard,
    fontPt,
    lineHeightPt: Math.max(
      fontPt * 1.3,
      fontPt === 10 ? 13.5 : 12.5,
      interpolate('lineHeightPt')
    ),
    marginTopMm: interpolate('marginMm'),
    marginBottomMm: interpolate('marginMm'),
    marginLeftMm: interpolate('sideMm'),
    marginRightMm: interpolate('sideMm'),
    paragraphAfterPt: interpolate('afterPt'),
    sectionBeforePt: interpolate('sectionBeforePt'),
    sectionPt: fontPt + 2.5,
    subheadingPt: Math.max(10.5, fontPt + 0.5),
  };
}

export function getResumeHeadingColor(accent: string) {
  return accent.toLowerCase() === '#2563eb' ? '#17365D' : accent;
}

function estimateContentEnd(
  lines: ResumeLayoutLine[],
  profile: typeof standard
) {
  const widthPt =
    ((210 - profile.marginLeftMm - profile.marginRightMm) * 72) / 25.4;
  let endPt = (profile.marginTopMm * 72) / 25.4;
  let previousAfter = 0;
  for (const { text, kind } of lines) {
    const fontPt =
      kind === 'name'
        ? profile.titlePt
        : kind === 'section'
          ? profile.sectionPt
          : kind === 'subheading'
            ? profile.subheadingPt
            : profile.fontPt;
    const advance = Array.from(text).reduce(
      (width, char) =>
        width + (/[\u0000-\u007f]/.test(char) ? 0.55 : 1) * fontPt,
      0
    );
    const rows = Math.max(1, Math.ceil(advance / widthPt));
    const before =
      kind === 'section'
        ? profile.sectionBeforePt
        : kind === 'subheading'
          ? profile.subheadingBeforePt
          : 0;
    // Word and CSS collapse adjacent paragraph spacing to the larger gap.
    endPt +=
      Math.max(previousAfter, before) +
      rows * (kind === 'body' ? profile.lineHeightPt : fontPt * 1.3) +
      (kind === 'section' ? 2 : 0);
    previousAfter =
      kind === 'name'
        ? profile.titleAfterPt
        : kind === 'section'
          ? profile.sectionAfterPt
          : kind === 'subheading'
            ? profile.subheadingAfterPt
            : profile.paragraphAfterPt;
  }
  return Math.max(0, endPt - profile.fontPt / 2);
}

export function selectResumeDensity(
  estimatedLines: number,
  templateId?: string
): ResumeDensity {
  // Thresholds calibrated against the saved samples and Microsoft Word pages.
  if (estimatedLines <= 25) return 'relaxed';
  if (estimatedLines <= 55) return 'standard';
  if (estimatedLines <= (templateId === 'campus' ? 95 : 88)) return 'compact';
  return 'two-page';
}

export function getResumePageLayout(text: string, templateId?: string) {
  let section = '';
  let previousKind: ResumeLineKind | undefined;
  const lines = text
    .split(/\r?\n/)
    .filter((line) => line.trim())
    .map((text, index) => {
      const normalized = text
        .replace(/^#+\s*/, '')
        .replace(/[【】]/g, '')
        .replace(/[:：]\s*$/, '')
        .trim();
      const kind: ResumeLineKind = sectionNames.has(normalized)
        ? 'section'
        : index === 0
          ? 'name'
          : (normalized.length <= 90 &&
                /[｜|]/.test(normalized) &&
                !/[；;]/.test(normalized) &&
                !/^(参与|协助|负责|使用|围绕|将|能够|掌握|记录|整理|配合)/.test(
                  normalized
                )) ||
              (section === '项目经历' &&
                (previousKind === 'section' ||
                  /(项目|系统|平台|工作台|工具)$/.test(normalized)) &&
                normalized.length <= 45 &&
                !/[，。；;：:]/.test(normalized) &&
                !/^(参与|协助|负责|使用|围绕|将|在)/.test(normalized))
            ? 'subheading'
            : 'body';
      if (kind === 'section') section = normalized;
      previousKind = kind;
      return { text, kind };
    });
  // Preserve text verbatim; normalization is only used to recognize headings.
  // Each line owns 0.5 spacing, with 2 extra for the name and 1.5 per section.
  const estimatedLines = lines.reduce(
    (total, line) =>
      total +
      Math.ceil(Array.from(line.text).length / 40) +
      0.5 +
      (line.kind === 'name' ? 2 : line.kind === 'section' ? 1.5 : 0),
    0
  );
  const density = selectResumeDensity(estimatedLines, templateId);
  const profile = getResumePageProfile(estimatedLines, templateId);
  const pageHeightPt = (297 * 72) / 25.4;
  const bodyCount = lines.filter((line) => line.kind === 'body').length;
  // Linear residual-space correction after interpolation. Never sacrifice the
  // heading or line-height floors to fill a page. Word remains the QA authority.
  if (estimatedLines > 25 && density !== 'two-page' && bodyCount) {
    for (let pass = 0; pass < 3; pass++) {
      const end = estimateContentEnd(lines, profile);
      if (end >= pageHeightPt * 0.85 && end <= pageHeightPt * 0.95) break;
      const after =
        Math.round(
          Math.max(
            2,
            Math.min(
              6,
              profile.paragraphAfterPt + (pageHeightPt * 0.92 - end) / bodyCount
            )
          ) * 20
        ) / 20;
      if (after === profile.paragraphAfterPt) break;
      profile.paragraphAfterPt = after;
    }
  }
  const estimatedEndPt = estimateContentEnd(lines, profile);
  return {
    lines,
    estimatedLines,
    density,
    profile,
    estimatedEndPt,
    remainingHeightPt:
      pageHeightPt - (profile.marginBottomMm * 72) / 25.4 - estimatedEndPt,
  };
}
