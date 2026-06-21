import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const declarationsDir = path.join(rootDir, 'dist-types');

async function listDeclarationFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        return listDeclarationFiles(entryPath);
      }
      return entry.name.endsWith('.d.ts') ? [entryPath] : [];
    })
  );
  return nested.flat();
}

function normalizeRelativeSpecifier(specifier) {
  if (!specifier.startsWith('./') && !specifier.startsWith('../')) {
    return specifier;
  }
  return path.posix.extname(specifier) ? specifier : `${specifier}.js`;
}

function normalizeDeclarationImports(source) {
  return source.replace(
    /(\b(?:import|export)\b[^'"]*\bfrom\s+['"])(\.{1,2}\/[^'"]+)(['"])/g,
    (_match, before, specifier, after) => `${before}${normalizeRelativeSpecifier(specifier)}${after}`
  );
}

const declarationFiles = await listDeclarationFiles(declarationsDir);
await Promise.all(
  declarationFiles.map(async (filePath) => {
    const source = await readFile(filePath, 'utf8');
    const normalized = normalizeDeclarationImports(source);
    if (normalized !== source) {
      await writeFile(filePath, normalized);
    }
  })
);
