import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { ResumeExtractionResult } from './types';

const maxFileSize = 10 * 1024 * 1024;

interface ResumeVisionConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

interface ChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

interface LocalOcrResult {
  text: string;
  engine: 'tesseract';
  lowResolution: boolean;
  cropped: boolean;
}

interface ImageCrop {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface OcrImageBuffer {
  buffer: Buffer;
  lowResolution: boolean;
  cropped: boolean;
}

interface OcrTempImageFile {
  filePath: string;
  lowResolution: boolean;
  cropped: boolean;
}

interface PdfParser {
  getText(): Promise<{ text: string }>;
  getScreenshot(params?: {
    first?: number;
    desiredWidth?: number;
    imageDataUrl?: boolean;
    imageBuffer?: boolean;
  }): Promise<{ pages: Array<{ dataUrl?: string }> }>;
  destroy(): Promise<void>;
}

type PdfParseConstructor = new (options: { data: Uint8Array }) => PdfParser;

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
  return text
    .replace(/\r/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function normalizePdfText(text: string) {
  return normalizeText(
    text
      .split('\n')
      .filter((line) => !/^\s*--\s*\d+\s+of\s+\d+\s*--\s*$/i.test(line))
      .join('\n')
  );
}

function normalizeOcrText(text: string) {
  const cjk = '\\u3400-\\u9fff\\uf900-\\ufaff';
  const cjkSpacePattern = new RegExp(`([${cjk}])\\s+([${cjk}])`, 'g');
  let normalized = normalizeText(text)
    .replace(/[ \t]{2,}/g, ' ')
    .replace(new RegExp(`([${cjk}])\\s+([，。；：、！？）】》])`, 'g'), '$1$2')
    .replace(new RegExp(`([（【《])\\s+([${cjk}])`, 'g'), '$1$2');

  let previous = '';
  while (previous !== normalized) {
    previous = normalized;
    normalized = normalized.replace(cjkSpacePattern, '$1$2');
  }

  return normalized;
}

function isLocalOcrEnabled() {
  return process.env.RESUMEFIT_LOCAL_OCR !== 'false';
}

function getLocalOcrLanguages() {
  const configured = process.env.RESUMEFIT_OCR_LANG || 'chi_sim';
  if (configured.includes('+')) {
    return configured;
  }

  return configured
    .split(',')
    .map((lang) => lang.trim())
    .filter(Boolean);
}

function getResumeVisionConfig(): ResumeVisionConfig | null {
  const apiKey = process.env.EVOLINK_API_KEY || process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    return null;
  }

  return {
    apiKey,
    baseUrl:
      process.env.EVOLINK_BASE_URL ||
      process.env.OPENROUTER_BASE_URL ||
      'https://openrouter.ai/api/v1',
    model:
      process.env.EVOLINK_VISION_MODEL ||
      process.env.RESUMEFIT_VISION_MODEL ||
      process.env.EVOLINK_FREE_MODEL ||
      process.env.RESUMEFIT_FREE_MODEL ||
      'openai/gpt-4o-mini',
  };
}

function chatCompletionsUrl(baseUrl: string) {
  return `${baseUrl.replace(/\/$/, '')}/chat/completions`;
}

function getPdfParse() {
  // A literal require keeps the external CJS entry traceable without tracing import.meta.url.
  return (require('pdf-parse') as { PDFParse: PdfParseConstructor }).PDFParse;
}

function dataUrlToBuffer(dataUrl: string) {
  const base64 = dataUrl.includes(',')
    ? dataUrl.slice(dataUrl.indexOf(',') + 1)
    : dataUrl;
  return Buffer.from(base64, 'base64');
}

function getDataUrlExtension(dataUrl: string) {
  const match = dataUrl.match(/^data:image\/([a-zA-Z0-9.+-]+);base64,/);
  const type = match?.[1]?.toLowerCase();
  if (type === 'jpeg') return 'jpg';
  if (type === 'png' || type === 'jpg' || type === 'webp') return type;
  return 'png';
}

function getDataUrlMimeType(dataUrl: string) {
  return dataUrl.match(/^data:([^;]+);base64,/)?.[1]?.toLowerCase() ?? '';
}

function isNearlyWhite(r: number, g: number, b: number) {
  return r > 248 && g > 248 && b > 248;
}

function isLightNeutralLinePixel(r: number, g: number, b: number) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max - min <= 12 && max >= 175 && max <= 245;
}

function clampCrop(crop: ImageCrop, width: number, height: number): ImageCrop {
  const left = Math.max(0, Math.min(width - 1, crop.left));
  const top = Math.max(0, Math.min(height - 1, crop.top));
  const right = Math.max(left + 1, Math.min(width, crop.left + crop.width));
  const bottom = Math.max(top + 1, Math.min(height, crop.top + crop.height));

  return {
    left,
    top,
    width: right - left,
    height: bottom - top,
  };
}

function detectMobileDocumentCrop(raw: Buffer, width: number, height: number) {
  const isMobileScreenshot = width > 0 && width <= 700 && height / width >= 1.6;
  if (!isMobileScreenshot) {
    return null;
  }

  const channels = raw.length / (width * height);
  if (channels < 3) {
    return null;
  }

  const whiteRatios: number[] = [];
  const neutralLineRatios: number[] = [];

  for (let y = 0; y < height; y += 1) {
    let white = 0;
    let neutralLine = 0;

    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * channels;
      const r = raw[offset];
      const g = raw[offset + 1];
      const b = raw[offset + 2];

      if (isNearlyWhite(r, g, b)) {
        white += 1;
      }

      if (isLightNeutralLinePixel(r, g, b)) {
        neutralLine += 1;
      }
    }

    whiteRatios.push(white / width);
    neutralLineRatios.push(neutralLine / width);
  }

  const topSearchStart = Math.floor(height * 0.06);
  const topSearchEnd = Math.floor(height * 0.24);
  let top = Math.floor(height * 0.1);

  for (let y = topSearchStart; y < topSearchEnd; y += 1) {
    if (neutralLineRatios[y] > 0.55 && whiteRatios[y] < 0.45) {
      top = y + 1;
      break;
    }
  }

  while (top < height - 1 && whiteRatios[top] < 0.45) {
    top += 1;
  }

  let bottom = height - 1;
  let lowWhiteRun = 0;
  const minPageHeight = Math.max(120, Math.floor(height * 0.35));

  for (let y = top + minPageHeight; y < height; y += 1) {
    if (whiteRatios[y] < 0.2) {
      lowWhiteRun += 1;
      if (lowWhiteRun >= 8) {
        bottom = y - lowWhiteRun;
        break;
      }
    } else {
      lowWhiteRun = 0;
    }
  }

  if (bottom <= top || bottom - top < minPageHeight) {
    return null;
  }

  const columnWhiteRatios: number[] = [];
  const cropHeight = bottom - top + 1;

  for (let x = 0; x < width; x += 1) {
    let white = 0;

    for (let y = top; y <= bottom; y += 1) {
      const offset = (y * width + x) * channels;
      if (isNearlyWhite(raw[offset], raw[offset + 1], raw[offset + 2])) {
        white += 1;
      }
    }

    columnWhiteRatios.push(white / cropHeight);
  }

  let left = 0;
  let right = width - 1;

  while (left < right && columnWhiteRatios[left] < 0.35) {
    left += 1;
  }

  while (right > left && columnWhiteRatios[right] < 0.35) {
    right -= 1;
  }

  const crop = clampCrop(
    {
      left: left - 2,
      top: top - 1,
      width: right - left + 5,
      height: bottom - top + 3,
    },
    width,
    height
  );

  if (crop.width < width * 0.55 || crop.height < height * 0.3) {
    return null;
  }

  return crop;
}

function getOcrTargetWidth(width: number) {
  if (width <= 0 || width >= 1800) {
    return undefined;
  }

  if (width < 500) {
    return Math.min(width * 4, 1200);
  }

  if (width < 1000) {
    return 3000;
  }

  return Math.min(width * 2, 2200);
}

async function imageDataUrlToOcrBuffer(
  dataUrl: string
): Promise<OcrImageBuffer> {
  const buffer = dataUrlToBuffer(dataUrl);

  try {
    const sharpModule = (await import('sharp')) as any;
    const sharp = sharpModule.default ?? sharpModule;
    const image = sharp(buffer, { limitInputPixels: 40_000_000 }).rotate();
    const metadata = await image.metadata();
    const sourceWidth = metadata.width ?? 0;
    const sourceHeight = metadata.height ?? 0;
    const lowResolution =
      sourceWidth > 0 &&
      sourceHeight > 0 &&
      (sourceWidth < 900 || sourceWidth * sourceHeight < 900_000);
    let crop: ImageCrop | null = null;

    if (sourceWidth > 0 && sourceHeight > 0) {
      const rawImage = await sharp(buffer, { limitInputPixels: 40_000_000 })
        .rotate()
        .flatten({ background: '#ffffff' })
        .raw()
        .toBuffer({ resolveWithObject: true });
      crop = detectMobileDocumentCrop(
        rawImage.data,
        rawImage.info.width,
        rawImage.info.height
      );
    }

    const width = crop?.width ?? sourceWidth;
    const targetWidth = getOcrTargetWidth(width);
    let pipeline = sharp(buffer, { limitInputPixels: 40_000_000 })
      .rotate()
      .flatten({ background: '#ffffff' })
      .grayscale()
      .normalize()
      .sharpen();

    if (crop) {
      pipeline = pipeline.extract(crop);
    }

    if (targetWidth) {
      pipeline = pipeline.resize({
        width: targetWidth,
        withoutEnlargement: false,
      });
    }

    return {
      buffer: await pipeline.jpeg({ quality: 95 }).toBuffer(),
      lowResolution,
      cropped: Boolean(crop),
    };
  } catch {
    // Fall through to the lightweight PNG path or original buffer.
  }

  if (getDataUrlMimeType(dataUrl) !== 'image/png') {
    return {
      buffer,
      lowResolution: false,
      cropped: false,
    };
  }

  try {
    const pngModule = (await import('pngjs')) as any;
    const jpegModule = (await import('jpeg-js')) as any;
    const PNG = pngModule.PNG ?? pngModule.default?.PNG;
    const encodeJpeg = jpegModule.encode ?? jpegModule.default?.encode;
    const png = PNG.sync.read(buffer);
    return {
      buffer: encodeJpeg(
        {
          data: png.data,
          width: png.width,
          height: png.height,
        },
        92
      ).data as Buffer,
      lowResolution: png.width < 900 || png.width * png.height < 900_000,
      cropped: false,
    };
  } catch {
    return {
      buffer,
      lowResolution: false,
      cropped: false,
    };
  }
}

async function dataUrlToTempImageFile(
  dataUrl: string,
  directory: string
): Promise<OcrTempImageFile> {
  const isPng = getDataUrlMimeType(dataUrl) === 'image/png';
  // Runtime output paths must not become Turbopack input-directory globs.
  const filePath = path.format({
    dir: directory,
    base: `${randomUUID()}.${isPng ? 'jpg' : getDataUrlExtension(dataUrl)}`,
  });
  const ocrImage = await imageDataUrlToOcrBuffer(dataUrl);
  await writeFile(filePath, ocrImage.buffer);
  return {
    filePath,
    lowResolution: ocrImage.lowResolution,
    cropped: ocrImage.cropped,
  };
}

async function callLocalOcrForResumeText(
  imageDataUrls: string[]
): Promise<LocalOcrResult | null> {
  if (!isLocalOcrEnabled() || imageDataUrls.length === 0) {
    return null;
  }

  try {
    const tesseract = (await import('tesseract.js')) as any;
    const cachePath =
      process.env.RESUMEFIT_OCR_CACHE_PATH ||
      path.format({ dir: tmpdir(), base: 'resumefit-tesseract-cache' });
    await mkdir(cachePath, { recursive: true });

    const worker = await tesseract.createWorker(getLocalOcrLanguages(), 1, {
      cachePath,
      // Trace the worker's own dependencies, not just its entry file.
      workerPath: require.resolve(
        'tesseract.js/src/worker-script/node/index.js'
      ),
      errorHandler: () => undefined,
      logger: () => undefined,
    });
    await worker.setParameters({
      preserve_interword_spaces: '1',
      tessedit_pageseg_mode: tesseract.PSM?.AUTO ?? '3',
      user_defined_dpi: '300',
    });

    try {
      const chunks: string[] = [];
      let lowResolution = false;
      let cropped = false;

      for (const imageDataUrl of imageDataUrls) {
        const tempImage = await dataUrlToTempImageFile(imageDataUrl, cachePath);
        lowResolution ||= tempImage.lowResolution;
        cropped ||= tempImage.cropped;
        try {
          const result = await worker.recognize(tempImage.filePath);
          const text = normalizeOcrText(result.data?.text ?? '');
          if (text) {
            chunks.push(text);
          }
        } finally {
          await unlink(tempImage.filePath).catch(() => undefined);
        }
      }

      const text = normalizeOcrText(chunks.join('\n\n'));
      return text
        ? { text, engine: 'tesseract', lowResolution, cropped }
        : null;
    } finally {
      await worker.terminate();
    }
  } catch {
    return null;
  }
}

async function callVisionModelForResumeText(
  imageDataUrls: string[],
  fileName?: string
) {
  const config = getResumeVisionConfig();
  if (!config) {
    return null;
  }

  try {
    const response = await fetch(chatCompletionsUrl(config.baseUrl), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: [
                  '请从这份简历图片或扫描页中提取全部可读文字。',
                  '只返回纯文本，不要解释，不要总结，不要编造缺失内容。',
                  `文件名：${fileName || 'resume'}`,
                ].join('\n'),
              },
              ...imageDataUrls.map((url) => ({
                type: 'image_url',
                image_url: { url },
              })),
            ],
          },
        ],
        temperature: 0,
      }),
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as ChatCompletionResponse;
    return normalizeText(payload.choices?.[0]?.message?.content ?? '');
  } catch {
    return null;
  }
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
  const PDFParse = getPdfParse();
  const data = new Uint8Array(await file.arrayBuffer());
  const parser = new PDFParse({ data });

  try {
    const result = await parser.getText();
    const text = normalizePdfText(result.text);
    if (text) {
      return {
        text,
        sourceType: 'pdf',
        confidence: 0.86,
        warnings: [],
        fileName: file.name,
      };
    }

    const screenshots = await parser.getScreenshot({
      first: 2,
      desiredWidth: 1400,
      imageDataUrl: true,
      imageBuffer: false,
    });
    const imageDataUrls = screenshots.pages
      .map((page) => page.dataUrl)
      .filter((url): url is string => Boolean(url));
    const visionText = imageDataUrls.length
      ? await callVisionModelForResumeText(imageDataUrls, file.name)
      : '';
    const localOcr = visionText
      ? null
      : await callLocalOcrForResumeText(imageDataUrls);
    const ocrText = visionText || localOcr?.text || '';

    return {
      text: ocrText || '',
      sourceType: 'pdf',
      confidence: ocrText ? (localOcr ? 0.68 : 0.72) : 0.25,
      warnings: ocrText
        ? [
            localOcr
              ? 'PDF 未检测到内嵌文本，已使用本地 OCR 识别扫描页。'
              : 'PDF 未检测到内嵌文本，已使用视觉 OCR 识别扫描页。',
          ]
        : [
            getResumeVisionConfig() || isLocalOcrEnabled()
              ? 'PDF 未提取到文本，扫描页 OCR 未返回可用内容，请检查视觉模型配置或粘贴简历文本继续。'
              : 'PDF 未提取到文本，可能是扫描件；请开启本地 OCR 或配置视觉模型 API Key，也可以直接粘贴简历文本。',
          ],
      fileName: file.name,
    };
  } finally {
    await parser.destroy();
  }
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

  throw new Error('Unsupported resume file type');
}
