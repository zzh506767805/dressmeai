import { readdir, mkdir, copyFile, readFile } from 'node:fs/promises';
import path from 'node:path';

const settings = JSON.parse(await readFile('i18n/settings.json', 'utf8'));
const defaultLocale = settings.defaultLocale;
const locales = new Set(settings.locales.map(locale => locale.code));
const buildId = (await readFile('.next/BUILD_ID', 'utf8')).trim();
const source = '.next/server/pages';
const target = '.open-next/assets';
let pages = 0;
async function copy(from, relative) {
  const destination = path.join(target, relative);
  await mkdir(path.dirname(destination), { recursive: true });
  await copyFile(from, destination);
}
async function visit(directory, prefix = '') {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const relative = path.join(prefix, entry.name);
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) { await visit(file, relative); continue; }
    if (entry.name.endsWith('.html')) {
      const route = relative.slice(0, -5).split(path.sep).join('/');
      const first = route.split('/')[0];
      if (!locales.has(first)) continue;
      await copy(file, `${route}/index.html`); pages++;
      if (first === defaultLocale) await copy(file, `${route.slice(first.length + 1) || ''}/index.html`);
    } else if (entry.name.endsWith('.json') && !entry.name.endsWith('.nft.json') && locales.has(relative.split(path.sep)[0])) {
      await copy(file, `_next/data/${buildId}/${relative}`);
    }
  }
}
await visit(source);
await copy('.next/server/app/sitemap.xml.body', 'sitemap.xml');
console.log(`Materialized ${pages} public pages and their Next.js data files as static assets.`);
