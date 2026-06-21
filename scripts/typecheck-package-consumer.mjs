import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'phosphene-package-typecheck-'));
const packDir = path.join(tempRoot, 'pack');
const consumerDir = path.join(tempRoot, 'consumer');
const tscBin = path.join(
  rootDir,
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'tsc.cmd' : 'tsc'
);

async function run(command, args, options = {}) {
  return execFileAsync(command, args, {
    ...options,
    maxBuffer: 1024 * 1024 * 5,
  });
}

try {
  await mkdir(packDir, { recursive: true });
  await mkdir(consumerDir, { recursive: true });

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

  await writeFile(
    path.join(consumerDir, 'tsconfig.json'),
    JSON.stringify(
      {
        compilerOptions: {
          module: 'NodeNext',
          moduleResolution: 'NodeNext',
          noEmit: true,
          skipLibCheck: false,
          strict: true,
          target: 'ES2022',
        },
        include: ['index.ts'],
      },
      null,
      2
    )
  );
  await writeFile(
    path.join(consumerDir, 'index.ts'),
    `
import { classify, parseText, type ReasoningNode } from 'phosphene/parser';
import { collectGraphEdges, flattenGraph } from 'phosphene/graph';

const root: ReasoningNode = {
  id: 'root',
  type: 'hypothesis',
  summary: 'Root',
  content: 'Root',
  depth: 0,
  tokenCount: 1,
  timestamp: 1,
  children: [{
    id: 'child',
    type: 'decision',
    summary: 'Child',
    content: 'Child',
    depth: 1,
    tokenCount: 1,
    timestamp: 2,
    children: [],
  }],
};

const classification: string = classify('Wait, reconsider this.');
const parsedCount: number = parseText('What if this works?').length;
const flatCount: number = flattenGraph(root).length;
const edgeCount: number = collectGraphEdges(root).length;

void classification;
void parsedCount;
void flatCount;
void edgeCount;
`
  );

  await run(tscBin, ['-p', path.join(consumerDir, 'tsconfig.json')], {
    cwd: consumerDir,
  });

  const runtimeSource = `
import { classify, parseText } from 'phosphene/parser';
import { collectGraphEdges, flattenGraph } from 'phosphene/graph';
const root = {
  id: 'root',
  type: 'hypothesis',
  summary: 'Root',
  content: 'Root',
  depth: 0,
  tokenCount: 1,
  timestamp: 1,
  children: [{
    id: 'child',
    type: 'decision',
    summary: 'Child',
    content: 'Child',
    depth: 1,
    tokenCount: 1,
    timestamp: 2,
    children: [],
  }],
};
console.log(JSON.stringify({
  classify: classify('Wait, reconsider this.'),
  parsed: parseText('What if this works?').length,
  flat: flattenGraph(root).length,
  edges: collectGraphEdges(root).length,
  installedPackage: 'phosphene',
  typecheck: true,
}));
`;
  const { stdout } = await run('node', ['--input-type=module', '--eval', runtimeSource], {
    cwd: consumerDir,
  });
  process.stdout.write(stdout.trim());
} finally {
  await rm(tempRoot, { force: true, recursive: true });
}
