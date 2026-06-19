#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import {
  copyFile,
  mkdir,
  readFile,
  rename,
  rm,
  stat,
} from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');
const defaultTarget = 'dist/snapshots/current';

class CliError extends Error {
  constructor(message, exitCode = 1) {
    super(message);
    this.exitCode = exitCode;
  }
}

function usage() {
  return [
    'Usage: publish-snapshot --source <boundary-pack-dir> [--target <snapshot-dir>] [--dry-run]',
    '',
    'Validates a redacted Phosphene Boundary pack and publishes it to the served snapshot directory.',
    '',
    'Options:',
    '  --source <dir>  Boundary pack directory containing manifest.json',
    `  --target <dir>  Snapshot target directory (default: ${defaultTarget})`,
    '  --dry-run       Validate and print the publish plan without writing',
    '  --help          Show this help',
  ].join('\n');
}

function parseArgs(argv) {
  const options = {
    source: undefined,
    target: defaultTarget,
    dryRun: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--') {
      continue;
    }

    if (arg === '--help' || arg === '-h') {
      console.log(usage());
      process.exit(0);
    }

    if (arg === '--dry-run') {
      options.dryRun = true;
      continue;
    }

    if (arg === '--source' || arg === '--target') {
      const value = argv[index + 1];
      if (!value || value.startsWith('--')) {
        throw new CliError(`${arg} requires a value`, 2);
      }
      if (arg === '--source') options.source = value;
      if (arg === '--target') options.target = value;
      index += 1;
      continue;
    }

    throw new CliError(`Unknown argument: ${arg}`, 2);
  }

  if (!options.source) {
    throw new CliError('--source is required', 2);
  }

  return {
    sourceDir: path.resolve(options.source),
    targetDir: path.resolve(options.target),
    dryRun: options.dryRun,
  };
}

async function exists(target) {
  try {
    await stat(target);
    return true;
  } catch {
    return false;
  }
}

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function safeManifestPath(sourceDir, fileName) {
  if (typeof fileName !== 'string' || fileName.trim().length === 0) {
    throw new CliError('manifest file entry must be a non-empty string');
  }
  if (path.isAbsolute(fileName)) {
    throw new CliError(`manifest file must be relative: ${fileName}`);
  }

  const normalized = path.normalize(fileName);
  if (normalized === '..' || normalized.startsWith(`..${path.sep}`)) {
    throw new CliError(`manifest file escapes source directory: ${fileName}`);
  }

  const resolved = path.resolve(sourceDir, normalized);
  const relative = path.relative(sourceDir, resolved);
  if (relative === '' || relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new CliError(`manifest file escapes source directory: ${fileName}`);
  }

  return normalized;
}

async function readManifest(sourceDir) {
  const manifestPath = path.join(sourceDir, 'manifest.json');
  let parsed;

  try {
    parsed = JSON.parse(await readFile(manifestPath, 'utf8'));
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'unknown read error';
    throw new CliError(`manifest.json could not be read: ${detail}`);
  }

  if (!isRecord(parsed)) {
    throw new CliError('manifest.json must contain a JSON object');
  }
  if (!Array.isArray(parsed.files) || parsed.files.length === 0) {
    throw new CliError('manifest.files must list at least one trace file');
  }

  const traceFiles = parsed.files.map((item, index) => {
    if (!isRecord(item)) {
      throw new CliError(`manifest.files[${index}] must be an object`);
    }
    return safeManifestPath(sourceDir, item.file);
  });

  return [...new Set(traceFiles)];
}

async function assertManifestFilesExist(sourceDir, traceFiles) {
  for (const fileName of traceFiles) {
    const fullPath = path.join(sourceDir, fileName);
    if (!(await exists(fullPath))) {
      throw new CliError(`manifest file is missing: ${fileName}`);
    }
  }
}

function runBoundaryValidation(sourceDir) {
  const validatorPath = path.join(repoRoot, 'scripts/validate-boundary-traces.mjs');
  const result = spawnSync(process.execPath, [validatorPath, sourceDir], {
    cwd: repoRoot,
    encoding: 'utf8',
  });

  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.status !== 0) {
    throw new CliError('Boundary validation failed');
  }
}

async function collectPublishFiles(sourceDir, traceFiles) {
  const supportFiles = ['manifest.json'];
  if (await exists(path.join(sourceDir, 'validation-report.json'))) {
    supportFiles.push('validation-report.json');
  }
  if (await exists(path.join(sourceDir, 'README.md'))) {
    supportFiles.push('README.md');
  }

  return [...new Set([...supportFiles, ...traceFiles])].sort((a, b) => a.localeCompare(b));
}

async function copyPublishFiles(sourceDir, targetDir, files) {
  for (const file of files) {
    const source = path.join(sourceDir, file);
    const target = path.join(targetDir, file);
    await mkdir(path.dirname(target), { recursive: true });
    await copyFile(source, target);
  }
}

async function replaceTargetAtomically(sourceDir, targetDir, files) {
  if (path.resolve(sourceDir) === path.resolve(targetDir)) {
    throw new CliError('source and target must be different directories');
  }

  const stamp = `${process.pid}-${Date.now()}`;
  const tempDir = `${targetDir}.tmp-${stamp}`;
  const previousDir = `${targetDir}.previous-${stamp}`;
  let movedExistingTarget = false;

  await rm(tempDir, { recursive: true, force: true });
  await rm(previousDir, { recursive: true, force: true });
  await mkdir(tempDir, { recursive: true });

  try {
    await copyPublishFiles(sourceDir, tempDir, files);
    await mkdir(path.dirname(targetDir), { recursive: true });

    if (await exists(targetDir)) {
      await rename(targetDir, previousDir);
      movedExistingTarget = true;
    }

    try {
      await rename(tempDir, targetDir);
    } catch (error) {
      if (movedExistingTarget && !(await exists(targetDir)) && await exists(previousDir)) {
        await rename(previousDir, targetDir);
      }
      throw error;
    }

    if (movedExistingTarget) {
      await rm(previousDir, { recursive: true, force: true });
    }
  } catch (error) {
    await rm(tempDir, { recursive: true, force: true });
    throw error;
  }
}

async function publishSnapshot(options) {
  const traceFiles = await readManifest(options.sourceDir);
  await assertManifestFilesExist(options.sourceDir, traceFiles);
  runBoundaryValidation(options.sourceDir);
  const files = await collectPublishFiles(options.sourceDir, traceFiles);

  if (options.dryRun) {
    console.log(`DRY RUN: would publish ${files.length} file(s)`);
    console.log(`Source: ${options.sourceDir}`);
    console.log(`Target: ${options.targetDir}`);
    for (const file of files) console.log(`- ${file}`);
    return;
  }

  await replaceTargetAtomically(options.sourceDir, options.targetDir, files);
  console.log(`Published ${files.length} file(s) to ${options.targetDir}`);
  for (const file of files) console.log(`- ${file}`);
}

try {
  await publishSnapshot(parseArgs(process.argv.slice(2)));
} catch (error) {
  const message = error instanceof Error ? error.message : 'unknown publish error';
  console.error(message);
  if (error instanceof CliError && error.exitCode === 2) {
    console.error('');
    console.error(usage());
  }
  process.exit(error instanceof CliError ? error.exitCode : 1);
}
