import { readdir, readFile, writeFile, access } from 'fs/promises';
import { join, dirname, resolve as resolvePath } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const esmDir = join(__dirname, '..', 'dist', 'esm');

// Native Node.js ESM requires explicit .js extensions on relative imports.
// TypeScript (with moduleResolution: node) emits them without extensions,
// so we add them as a post-build step.

async function exists(p) {
  try { await access(p); return true; } catch { return false; }
}

async function resolveSpecifier(fromFile, specifier) {
  const base = dirname(fromFile);
  const candidate = resolvePath(base, specifier);
  // Is it an exact .js file?
  if (await exists(candidate + '.js')) return specifier + '.js';
  // Is it a directory with an index.js?
  if (await exists(join(candidate, 'index.js'))) return specifier + '/index.js';
  // Already has extension or can't resolve — leave it alone
  return null;
}

async function fixEsmExtensions() {
  const files = await readdir(esmDir, { recursive: true });

  for (const file of files) {
    if (!file.endsWith('.js') && !file.endsWith('.d.ts')) continue;

    const filePath = join(esmDir, file);
    let content = await readFile(filePath, 'utf8');

    // Collect all relative imports/exports without extensions
    const pattern = /((?:import|export)[^'"]*from\s+['"])(\.{1,2}\/[^'"]*?)(['"])/g;
    const replacements = [];
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const [full, prefix, specifier, suffix] = match;
      if (/\.[^/]+$/.test(specifier)) continue; // already has extension
      const resolved = await resolveSpecifier(filePath, specifier);
      if (resolved) {
        replacements.push({ full, replacement: `${prefix}${resolved}${suffix}` });
      }
    }

    if (replacements.length > 0) {
      let fixed = content;
      for (const { full, replacement } of replacements) {
        fixed = fixed.replace(full, replacement);
      }
      await writeFile(filePath, fixed);
    }
  }
}

fixEsmExtensions().catch(console.error);
