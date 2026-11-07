import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { getServerSideProps } from '../pages/feed.xml';
import settings from '../i18n/settings.json';

async function main() {
  for (const locale of settings.locales) {
    let xml = '';
    await getServerSideProps({ locale: locale.code, res: { setHeader() {}, write(value: string) { xml += value; return true; }, end() {} } } as never);
    const folder = path.join('.open-next/assets', locale.code);
    await mkdir(folder, { recursive: true });
    await writeFile(path.join(folder, 'feed.xml'), xml);
    if (locale.code === settings.defaultLocale) await writeFile('.open-next/assets/feed.xml', xml);
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
