import { readdir, unlink } from 'node:fs/promises';
import path from 'node:path';

// Only remove generated system metadata from the build output, never sources.
async function clean(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) await clean(target);
    else if (entry.name === '.DS_Store') await unlink(target);
  }
}
await clean('.open-next/assets');
