import { ResumeExtractionResult } from './types';

const maxFileSize = 10 * 1024 * 1024;

function getFileExtension(fileName: string) {
  const parts = fileName.toLowerCase().split('.');
  return parts.length > 1 ? parts[parts.length - 1] : '';
}

function assertAllowedSize(file: File) {
  if (file.size > maxFileSize) {
    throw new Error('Resume file is too large. Maximum size is 10MB.');
  }
}

function normalizeText(text: string) {
  return text.replace(/\r/g, '').replace(/\n{3,}/g, '\n\n').trim();
}

async function extractTextFile(file: File): Promise<ResumeExtractionResult> {
  return {
    text: normalizeText(await file.text()),
    sourceType: 'text',
    confidence: 0.98,
    warnings: [],
    fileName: file.name,
  };
}

async function extractDocxFile(file: File): Promise<ResumeExtractionResult> {
  const mammoth = await import('mammoth');
  const buffer = Buffer.from(await file.arrayBuffer());
  const result = await mammoth.extractRawText({ buffer });
  const warnings = result.messages.map((message) => message.message);

  return {
    text: normalizeText(result.value),
    sourceType: 'docx',
    confidence: result.value.trim() ? 0.92 : 0.35,
    warnings,
    fileName: file.name,
  };
}

async function extractPdfFile(file: File): Promise<ResumeExtractionResult> {
  const { PDFParse } = await import('pdf-parse');
  const data = new Uint8Array(await file.arrayBuffer());
  const parser = new PDFParse({ data });

  try {
    const result = await parser.getText();
    const text = normalizeText(result.text);
    const warnings = text
      ? []
      : ['PDF 未提取到文本，可能是扫描件，需要 OCR 或直接粘贴简历文本。'];

    return {
      text,
      sourceType: 'pdf',
      confidence: text ? 0.86 : 0.25,
      warnings,
      fileName: file.name,
    };
  } finally {
    await parser.destroy();
  }
}

function createImageExtractionResult(file: File): ResumeExtractionResult {
  return {
    text: '',
    sourceType: 'image',
    confidence: 0.2,
    warnings: ['图片简历需要通过视觉模型识别，或直接粘贴简历文本继续。'],
    fileName: file.name,
  };
}

export async function extractResumeTextFromFile(
  file: File
): Promise<ResumeExtractionResult> {
  assertAllowedSize(file);

  const extension = getFileExtension(file.name);
  const type = file.type.toLowerCase();

  if (type.startsWith('text/') || ['txt', 'md'].includes(extension)) {
    return extractTextFile(file);
  }

  if (
    type ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    extension === 'docx'
  ) {
    return extractDocxFile(file);
  }

  if (type === 'application/pdf' || extension === 'pdf') {
    return extractPdfFile(file);
  }

  if (type.startsWith('image/') || ['png', 'jpg', 'jpeg'].includes(extension)) {
    return createImageExtractionResult(file);
  }

  throw new Error('Unsupported resume file type');
}
