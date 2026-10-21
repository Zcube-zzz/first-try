import bundleAnalyzer from '@next/bundle-analyzer';
import { createMDX } from 'fumadocs-mdx/next';
import createNextIntlPlugin from 'next-intl/plugin';

const withMDX = createMDX();

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

const withNextIntl = createNextIntlPlugin({
  requestConfig: './src/core/i18n/request.ts',
});

// Netlify runs glibc Linux. Its adapter's musl filter only covers pnpm's
// isolated layout, so apply it to hoisted dependencies as well.
const netlifyNativeExcludes =
  process.env.NETLIFY === 'true' && process.platform === 'linux'
    ? [
        '**/node_modules/@napi-rs/canvas-linux-*-musl/**/*',
        '**/node_modules/@img/*linuxmusl*/**/*',
        '**/node_modules/@libsql/*musl*/**/*',
      ]
    : [];

const canvasNativeIncludes =
  process.platform === 'linux'
    ? ['./node_modules/@napi-rs/canvas-linux-x64-gnu/**/*']
    : ['./node_modules/@napi-rs/canvas-win32-x64-msvc/**/*'];
const canvasPnpmNativeIncludes = canvasNativeIncludes.map((pattern) =>
  pattern.replace('./node_modules/', './node_modules/.pnpm/node_modules/')
);

const runtimeTraceExcludes = [
  '.git/**/*',
  '.env*',
  '.dev.vars*',
  '.tmp/**/*',
  'outputs/**/*',
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  // pnpm standalone tracing creates symlinks that require extra Windows rights.
  // Native Windows uses next start; Linux self-hosting keeps standalone output.
  output:
    process.env.VERCEL || process.platform === 'win32'
      ? undefined
      : 'standalone',
  reactStrictMode: false,
  serverExternalPackages: [
    'mammoth',
    'pdf-parse',
    '@napi-rs/canvas',
    'sharp',
    'tesseract.js',
  ],
  // Local credentials and retained QA evidence are never runtime dependencies.
  outputFileTracingExcludes: {
    '/*': [
      ...runtimeTraceExcludes,
      // Keep the pnpm lookup copy below; copying its physical-package aliases
      // as well triples the same Canvas binary in standalone output.
      'node_modules/.pnpm/*/node_modules/@napi-rs/canvas*/**/*',
      ...netlifyNativeExcludes,
    ],
    'next-server': [...runtimeTraceExcludes, ...netlifyNativeExcludes],
  },
  outputFileTracingIncludes: {
    '/api/resume/parse': [
      './node_modules/pdf-parse/dist/pdf-parse/cjs/pdf.worker.mjs',
      './node_modules/.pnpm/pdf-parse@*/node_modules/pdf-parse/dist/pdf-parse/cjs/pdf.worker.mjs',
      ...canvasNativeIncludes,
      // Use one pnpm lookup location, not every alias of the same native binary.
      ...canvasPnpmNativeIncludes,
      './node_modules/tesseract.js-core/*.wasm',
      './node_modules/.pnpm/tesseract.js-core@*/node_modules/tesseract.js-core/*.wasm',
    ],
  },
  pageExtensions: ['ts', 'tsx', 'js', 'jsx', 'md', 'mdx'],
  images: {
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    qualities: [60, 70, 75],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*',
      },
    ],
  },
  async redirects() {
    return [];
  },
  async headers() {
    return [
      {
        source: '/imgs/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
  turbopack: {
    resolveAlias: {
      // fs: {
      //   browser: './empty.ts', // We recommend to fix code imports before using this method
      // },
    },
  },
  experimental: {
    turbopackFileSystemCacheForDev: true,
    // Disable mdxRs for Vercel deployment compatibility with fumadocs-mdx
    ...(process.env.VERCEL ? {} : { mdxRs: true }),
  },
  reactCompiler: true,
};

export default withBundleAnalyzer(withNextIntl(withMDX(nextConfig)));
