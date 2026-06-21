import { execFile } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'phosphene-package-smoke-'));
const packDir = path.join(tempRoot, 'pack');
const consumerDir = path.join(tempRoot, 'consumer');

async function run(command, args, options = {}) {
  return execFileAsync(command, args, {
    ...options,
    maxBuffer: 1024 * 1024 * 5,
  });
}

try {
  await writeFile(path.join(tempRoot, '.keep'), '');
  await run('mkdir', ['-p', packDir, consumerDir]);

  const { stdout: packStdout } = await run(
    'npm',
    ['pack', '--json', '--pack-destination', packDir],
    { cwd: rootDir }
  );
  const [pack] = JSON.parse(packStdout);
  if (!pack?.filename) {
    throw new Error('npm pack did not return a tarball filename');
  }

  const tarballPath = path.join(packDir, pack.filename);
  await writeFile(
    path.join(consumerDir, 'package.json'),
    JSON.stringify({ private: true, type: 'module' }, null, 2)
  );
  await run(
    'npm',
    [
      'install',
      '--ignore-scripts',
      '--package-lock=false',
      '--no-audit',
      '--no-fund',
      tarballPath,
    ],
    { cwd: consumerDir }
  );

  const smokeSource = `
import { classify, segment } from 'phosphene/parser';
import { collectGraphEdges, flattenGraph } from 'phosphene/graph';
const root = {
  id: 'root',
  type: 'hypothesis',
  summary: 'Root',
  content: 'Root',
  depth: 0,
  tokenCount: 1,
  children: [{
    id: 'child',
    type: 'decision',
    summary: 'Child',
    content: 'Child',
    depth: 1,
    tokenCount: 1,
    children: [],
  }],
};
console.log(JSON.stringify({
  classify: classify('Wait, reconsider this.'),
  segments: segment('One.\\n\\nTwo.').length,
  flat: flattenGraph(root).length,
  edges: collectGraphEdges(root).length,
  installedPackage: 'phosphene',
}));
`;
  const { stdout } = await run('node', ['--input-type=module', '--eval', smokeSource], {
    cwd: consumerDir,
  });
  process.stdout.write(stdout.trim());
} finally {
  await rm(tempRoot, { force: true, recursive: true });
}
