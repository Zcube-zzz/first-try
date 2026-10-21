import assert from 'node:assert/strict';
import fs from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Document, Packer, Paragraph } from 'docx';

const { onPostBuild } = require('../../netlify/plugins/function-size');

async function main() {
  const dir = fs.mkdtempSync(path.join(tmpdir(), 'resumefit-function-size-'));
  const constants = { FUNCTIONS_DIST: dir };
  const utils = {
    build: {
      failBuild(message: string) {
        throw new Error(message);
      },
    },
  };
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
    assert.throws(() => onPostBuild({ constants, utils }), /limit is 250 MiB/);

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
