const fs = require('node:fs');
const path = require('node:path');

const limit = 250 * 1024 * 1024;

// Read the ZIP central directory: sum packaged entries, including physical
// duplicates. Resolving/deduplicating source paths understates Lambda's size.
function zipEntries(file) {
  const data = fs.readFileSync(file);
  const end = data.lastIndexOf(Buffer.from('504b0506', 'hex'));
  if (end < 0 || end + 22 > data.length)
    throw new Error(`Invalid ZIP: ${file}`);
  const count = data.readUInt16LE(end + 10);
  let offset = data.readUInt32LE(end + 16);
  if (count === 0xffff || offset === 0xffffffff) {
    throw new Error(`ZIP64 requires a separate size check: ${file}`);
  }
  const entries = [];
  for (let i = 0; i < count; i++) {
    if (data.readUInt32LE(offset) !== 0x02014b50) {
      throw new Error(`Invalid ZIP central directory: ${file}`);
    }
    const length = data.readUInt16LE(offset + 28);
    entries.push({
      name: data.toString('utf8', offset + 46, offset + 46 + length),
      bytes: data.readUInt32LE(offset + 24),
    });
    offset +=
      46 +
      length +
      data.readUInt16LE(offset + 30) +
      data.readUInt16LE(offset + 32);
  }
  return entries;
}

module.exports = {
  onPostBuild({ constants, utils }) {
    const archives = [];
    function walk(dir) {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const file = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(file);
        else if (
          entry.name.endsWith('.zip') &&
          entry.name.includes('server-handler')
        )
          archives.push(file);
      }
    }
    walk(constants.FUNCTIONS_DIST);
    if (!archives.length) {
      return utils.build.failBuild(
        'Next.js function ZIP not found; cannot verify final deployment size.'
      );
    }
    for (const archive of archives) {
      const entries = zipEntries(archive);
      const bytes = entries.reduce((sum, entry) => sum + entry.bytes, 0);
      const largest = entries.sort((a, b) => b.bytes - a.bytes).slice(0, 10);
      console.log(
        `[function-size] ${path.basename(archive)}: ${(bytes / 1048576).toFixed(2)} MiB unpacked (${entries.length} entries)`
      );
      console.log(
        '[function-size] Largest packaged files:',
        JSON.stringify(largest)
      );
      if (bytes > limit) {
        return utils.build.failBuild(
          `Next.js function is ${(bytes / 1048576).toFixed(2)} MiB; limit is 250 MiB. See [function-size] above.`
        );
      }
    }
  },
};
