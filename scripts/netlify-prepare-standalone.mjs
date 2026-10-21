import fs from 'node:fs';
import path from 'node:path';

if (process.env.NETLIFY !== 'true' || process.platform !== 'linux') {
  process.exit(0);
}

const projectRoot = path.resolve(process.cwd());
const standaloneRoot = path.resolve(projectRoot, '.next', 'standalone');
if (!standaloneRoot.startsWith(`${projectRoot}${path.sep}`)) {
  throw new Error('Standalone output must stay inside the project directory.');
}
if (!fs.existsSync(standaloneRoot)) {
  throw new Error('Next.js standalone output was not found after the build.');
}

const unusedMuslPackage = /linux(?:musl|-[a-z0-9]+-musl)/i;
const removed = [];
const pending = [standaloneRoot];

while (pending.length) {
  const directory = pending.pop();
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.name === '.git' || unusedMuslPackage.test(entry.name)) {
      fs.rmSync(target, { recursive: true, force: true });
      removed.push(path.relative(standaloneRoot, target).replace(/\\/g, '/'));
    } else if (entry.isDirectory()) {
      pending.push(target);
    }
  }
}

console.log(
  `[netlify-standalone] Removed ${removed.length} repository-history and musl runtime paths${removed.length ? `: ${removed.join(', ')}` : '.'}`
);
