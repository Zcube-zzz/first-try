import assert from 'node:assert/strict';
import fs from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Document, Packer, Paragraph } from 'docx';

const { onBuild, onPostBuild } = require('../../netlify/plugins/function-size');
const picomatch = require('next/dist/compiled/picomatch');

async function main() {
  const dir = fs.mkdtempSync(path.join(tmpdir(), 'resumefit-function-size-'));
  const constants = { FUNCTIONS_DIST: dir, PACKAGE_PATH: dir };
  const utils = {
    build: {
      failBuild(message: string) {
        throw new Error(message);
      },
    },
  };
  assert.throws(() => onBuild({ constants, utils }), /adapter must run before/);
  const manifestPath = path.join(
    dir,
    '.netlify/functions-internal/___netlify-server-handler/___netlify-server-handler.json'
  );
  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
  fs.writeFileSync(
    manifestPath,
    JSON.stringify({
      version: 1,
      config: {
        nodeBundler: 'none',
        includedFiles: ['**'],
        includedFilesBasePath: dir,
      },
    })
  );
  onBuild({ constants, utils });
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  assert.equal(manifest.config.nodeBundler, 'none');
  assert.equal(manifest.config.includedFilesBasePath, dir);
  assert.equal(manifest.version, 1);
  const excluded = manifest.config.includedFiles
    .filter((pattern: string) => pattern.startsWith('!'))
    .map((pattern: string) => picomatch(pattern.slice(1), { dot: true }));
  for (const file of [
    '.git/objects/pack/history.pack',
    '.git', // A Git worktree can have a .git file instead of a directory.
    'node_modules/@img/sharp-libvips-linuxmusl-x64/lib/libvips.so',
    'node_modules/@img/sharp-linuxmusl-x64', // A package can be a symlink.
    'node_modules/@napi-rs/canvas-linux-x64-musl/skia.node',
    'node_modules/@libsql/linux-x64-musl/index.node',
  ])
    assert.ok(
      excluded.some((match: (value: string) => boolean) => match(file)),
      file
    );
  for (const file of [
    'node_modules/@napi-rs/canvas-linux-x64-gnu/skia.node',
    'node_modules/@img/sharp-libvips-linux-x64/lib/libvips.so',
    'node_modules/pdf-parse/dist/pdf-parse/cjs/pdf.worker.mjs',
    '.next/server/app/api/auth/route.js',
    '.netlify/dist/run/handlers/server.js',
  ])
    assert.ok(
      !excluded.some((match: (value: string) => boolean) => match(file)),
      file
    );
  onBuild({ constants, utils });
  assert.deepEqual(JSON.parse(fs.readFileSync(manifestPath, 'utf8')), manifest);
  assert.throws(() => onPostBuild({ constants, utils }), /ZIP not found/);

  // DOCX is a real compressed ZIP; use highly compressible text to distinguish
  // packaged/uncompressed size from the archive's much smaller download size.
  const zip = await Packer.toBuffer(
    new Document({
      sections: [{ children: [new Paragraph('ResumeFit '.repeat(30000))] }],
    })
  );
  assert.ok(zip.length < 100000);
  const archive = path.join(dir, '___netlify-server-handler.zip');
  fs.writeFileSync(archive, zip);
  const originalLog = console.log;
  const logs: string[] = [];
  console.log = (...args) => logs.push(args.join(' '));
  try {
    onPostBuild({ constants, utils });
    const unpackedMiB = Number(logs[0].match(/: ([\d.]+) MiB/)?.[1]);
    assert.ok(unpackedMiB > 0.25);

    const oversized = Buffer.from(zip);
    const end = oversized.lastIndexOf(Buffer.from('504b0506', 'hex'));
    const centralDirectory = oversized.readUInt32LE(end + 16);
    oversized.writeUInt32LE(251 * 1048576, centralDirectory + 24);
    fs.writeFileSync(archive, oversized);
    assert.throws(
      () => onPostBuild({ constants, utils }),
      (error: Error) => {
        assert.match(error.message, /limit is 250 MiB/);
        assert.match(error.message, /Largest packaged files:/);
        assert.match(error.message, /\(251\.00 MiB\)/);
        return true;
      }
    );

    fs.writeFileSync(archive, Buffer.from('invalid archive'));
    assert.throws(() => onPostBuild({ constants, utils }), /Invalid ZIP/);
  } finally {
    console.log = originalLog;
  }
  console.log('Final function ZIP size checks passed');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
