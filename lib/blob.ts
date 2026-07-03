import { BlobServiceClient } from '@azure/storage-blob';

const AZURE_STORAGE_ACCOUNT = process.env.AZURE_STORAGE_ACCOUNT;
const AZURE_STORAGE_KEY = process.env.AZURE_STORAGE_KEY;
const AZURE_STORAGE_CONTAINER = process.env.AZURE_STORAGE_CONTAINER;

if (!AZURE_STORAGE_ACCOUNT || !AZURE_STORAGE_KEY || !AZURE_STORAGE_CONTAINER) {
  throw new Error('Azure storage environment variables are not configured');
}

const connectionString = `DefaultEndpointsProtocol=https;AccountName=${AZURE_STORAGE_ACCOUNT};AccountKey=${AZURE_STORAGE_KEY};EndpointSuffix=core.windows.net`;
const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
const containerClient = blobServiceClient.getContainerClient(AZURE_STORAGE_CONTAINER);

const ensureContainer = containerClient.createIfNotExists({ access: 'blob' });

export async function uploadImageBuffer(buffer: Buffer, prefix = 'tryon'): Promise<string> {
  await ensureContainer;
  const fileName = `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
  const blockBlobClient = containerClient.getBlockBlobClient(fileName);
  await blockBlobClient.uploadData(buffer, {
    blobHTTPHeaders: { blobContentType: 'image/jpeg' },
  });
  return blockBlobClient.url;
}

// Deletes a blob if the URL belongs to our container; ignores foreign URLs.
export async function deleteBlobByUrl(url: string): Promise<void> {
  const prefix = `${containerClient.url}/`;
  if (!url.startsWith(prefix)) return;
  const blobName = decodeURIComponent(url.slice(prefix.length).split('?')[0]);
  await containerClient.deleteBlob(blobName).catch(() => {});
}
