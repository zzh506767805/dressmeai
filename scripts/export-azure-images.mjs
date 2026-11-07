import { execFileSync } from 'node:child_process';
import { mkdir, writeFile, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { BlobServiceClient, StorageSharedKeyCredential } from '@azure/storage-blob';

const out = path.resolve(process.argv[2] || '.migration/source-20261107');
await mkdir(out, { recursive: true, mode: 0o700 });
const settingsResult = JSON.parse(execFileSync('az', ['staticwebapp', 'appsettings', 'list', '-n', 'dressmeai', '-g', '出海去', '-o', 'json'], { encoding: 'utf8' }));
const settings = settingsResult.properties || settingsResult;
const account = settings.AZURE_STORAGE_ACCOUNT;
if (account !== 'dressmeaiupload') throw new Error('Unexpected storage account');
const service = new BlobServiceClient(`https://${account}.blob.core.windows.net`, new StorageSharedKeyCredential(account, settings.AZURE_STORAGE_KEY));
const container = service.getContainerClient(settings.AZURE_STORAGE_CONTAINER);
const blobs = [];
for await (const blob of container.listBlobsFlat()) blobs.push(blob);
let cursor = 0;
const manifest = [];
await Promise.all(Array.from({ length: 8 }, async () => {
  while (cursor < blobs.length) {
    const blob = blobs[cursor++];
    const relative = path.join('images', blob.name);
    const file = path.resolve(out, relative);
    if (!file.startsWith(`${out}${path.sep}`)) throw new Error('Unsafe object name');
    await mkdir(path.dirname(file), { recursive: true, mode: 0o700 });
    const client = container.getBlobClient(blob.name);
    await client.downloadToFile(file);
    const buffer = await readFile(file);
    if (buffer.length !== blob.properties.contentLength) throw new Error('Image size mismatch');
    manifest.push({ sourceUrl: client.url, key: `legacy/${blob.name}`, file: relative, bytes: buffer.length, sha256: createHash('sha256').update(buffer).digest('hex'), contentType: blob.properties.contentType || 'image/jpeg' });
  }
}));
manifest.sort((a,b) => a.key.localeCompare(b.key));
await writeFile(path.join(out, 'image-manifest.json'), JSON.stringify(manifest, null, 2), { mode: 0o600 });
console.log(JSON.stringify({ files: manifest.length, bytes: manifest.reduce((sum,item) => sum+item.bytes,0), output: out }));
