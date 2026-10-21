import {
  AlignmentType,
  Document,
  HeadingLevel,
  LineRuleType,
  Packer,
  Paragraph,
  TextRun,
} from 'docx';
import { z } from 'zod';

import { getResumeFillInFields } from '@/shared/services/resume/draft';
import {
  getResumeHeadingColor,
  getResumePageLayout,
} from '@/shared/services/resume/page-layout';
import {
  getResumeLayoutTemplate,
  getResumeVisualTheme,
} from '@/shared/services/resume/visual-templates';

export const runtime = 'nodejs';

const requestSchema = z.object({
  title: z.string().trim().min(1).max(120),
  rewrittenResume: z
    .string()
    .min(1)
    .max(50000)
    .refine((text) => text.trim().length > 0),
  templateId: z.string().trim().optional(),
  layoutTemplateId: z.string().trim().optional(),
  visualThemeId: z.string().trim().optional(),
});

export async function POST(request: Request) {
  try {
    const input = requestSchema.parse(await request.json());
    if (/{{[^{}\r\n]*}}/.test(input.rewrittenResume)) {
      return Response.json(
        { code: -1, message: '请先填写待确认标签，或选择暂无数据后再导出。' },
        { status: 400 }
      );
    }
    const layout = getResumeLayoutTemplate(input.layoutTemplateId);
    const theme = getResumeVisualTheme(input.visualThemeId);
    const pageLayout = getResumePageLayout(
      input.rewrittenResume,
      input.templateId
    );
    const { profile } = pageLayout;
    const headingColor = getResumeHeadingColor(theme.accentColor).replace(
      '#',
      ''
    );
    const points = (value: number) => Math.round(value * 20);
    const millimeters = (value: number) => Math.round((value * 1440) / 25.4);
    const lines = pageLayout.lines.map(({ text: line, kind }) => {
      const isSection = kind === 'section';
      const isName = kind === 'name';
      const isSubheading = kind === 'subheading';
      const isHeading = kind !== 'body';
      const fontPt = isName
        ? profile.titlePt
        : isSection
          ? profile.sectionPt
          : isSubheading
            ? profile.subheadingPt
            : profile.fontPt;

      return new Paragraph({
        children: [
          new TextRun({
            text: line,
            bold: isHeading,
            boldComplexScript: isHeading,
            size: fontPt * 2,
            sizeComplexScript: fontPt * 2,
            color: isSection ? headingColor : '111827',
          }),
        ],
        heading: isName
          ? HeadingLevel.TITLE
          : isSection
            ? HeadingLevel.HEADING_2
            : isSubheading
              ? HeadingLevel.HEADING_3
              : undefined,
        alignment: isName ? AlignmentType.CENTER : AlignmentType.LEFT,
        keepNext: isHeading,
        keepLines: true,
        spacing: {
          before: isSection
            ? points(profile.sectionBeforePt)
            : isSubheading
              ? points(profile.subheadingBeforePt)
              : 0,
          after: points(
            isName
              ? profile.titleAfterPt
              : isSection
                ? profile.sectionAfterPt
                : isSubheading
                  ? profile.subheadingAfterPt
                  : profile.paragraphAfterPt
          ),
          line: points(isHeading ? fontPt * 1.3 : profile.lineHeightPt),
          lineRule: LineRuleType.EXACT,
        },
        border: isSection
          ? {
              bottom: {
                color: headingColor,
                size: 8,
                style: 'single',
              },
            }
          : undefined,
      });
    });
    const document = new Document({
      title: input.title,
      description: `${layout.title} · ${theme.title}`,
      styles: {
        default: {
          document: {
            run: {
              font: 'Microsoft YaHei',
              size: profile.fontPt * 2,
              color: '111827',
              bold: false,
              boldComplexScript: false,
            },
            paragraph: {
              spacing: {
                line: points(profile.lineHeightPt),
                lineRule: LineRuleType.EXACT,
                after: points(profile.paragraphAfterPt),
              },
            },
          },
        },
        paragraphStyles: [
          {
            id: 'Title',
            name: 'Title',
            basedOn: 'Normal',
            run: {
              size: profile.titlePt * 2,
              bold: true,
              boldComplexScript: true,
              color: '111827',
            },
          },
          {
            id: 'Heading2',
            name: 'Heading 2',
            basedOn: 'Normal',
            run: {
              size: profile.sectionPt * 2,
              bold: true,
              boldComplexScript: true,
              color: headingColor,
            },
          },
          {
            id: 'Heading3',
            name: 'Heading 3',
            basedOn: 'Normal',
            run: {
              size: profile.subheadingPt * 2,
              bold: true,
              boldComplexScript: true,
              color: '111827',
            },
          },
        ],
      },
      sections: [
        {
          properties: {
            page: {
              size: { width: 11906, height: 16838 },
              margin: {
                top: millimeters(profile.marginTopMm),
                bottom: millimeters(profile.marginBottomMm),
                left: millimeters(profile.marginLeftMm),
                right: millimeters(profile.marginRightMm),
              },
            },
          },
          children: lines,
        },
      ],
    });

    const buffer = new Uint8Array(await Packer.toBuffer(document));
    const safeName =
      input.title.replace(/[\\/:*?"<>|]/g, '').trim() || 'resumefit-resume';
    const draftSuffix = getResumeFillInFields(input.rewrittenResume).length
      ? '-待填写草稿'
      : '';
    return new Response(buffer, {
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(safeName + draftSuffix)}.docx"`,
        'Cache-Control': 'no-store',
        'X-Resume-Density': pageLayout.density,
        'X-Resume-Estimated-Lines': String(pageLayout.estimatedLines),
      },
    });
  } catch (error: any) {
    return Response.json(
      { code: -1, message: error.message || 'Resume export failed' },
      { status: 400 }
    );
  }
}
