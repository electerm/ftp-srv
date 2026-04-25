import { writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const cjsDir = join(__dirname, '..', 'dist', 'cjs');

// Inject a package.json so Node treats the .js files in dist/cjs as CommonJS,
// even though the root package.json has "type": "module".
async function fixCjs() {
  await writeFile(
    join(cjsDir, 'package.json'),
    JSON.stringify({ type: 'commonjs' }, null, 2) + '\n',
  );
}

fixCjs().catch(console.error);
