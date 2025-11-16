import { NextApiRequest, NextApiResponse } from 'next';
import sharp from 'sharp';
import { BlobServiceClient } from '@azure/storage-blob';

interface ErrorResponse {
  message: string;
}

interface SuccessResponse {
  url: string;
}

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

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SuccessResponse | ErrorResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    console.log('Processing upload request...');
    const { image } = req.body;

    if (!image) {
      return res.status(400).json({ message: 'No image provided' });
    }

    // Remove data:image/xxx;base64, prefix if exists
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    console.log('Compressing image...');
    const compressedBuffer = await sharp(buffer)
      .resize(1024, 1024, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({
        quality: 80,
        progressive: true
      })
      .toBuffer();

    await ensureContainer;

    const fileName = `tryon-${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
    const blockBlobClient = containerClient.getBlockBlobClient(fileName);

    console.log('Uploading to Azure Blob Storage...', blockBlobClient.url);
    await blockBlobClient.uploadData(compressedBuffer, {
      blobHTTPHeaders: {
        blobContentType: 'image/jpeg'
      }
    });

    return res.status(200).json({ url: blockBlobClient.url });
  } catch (error: any) {
    console.error('Upload error:', error);
    const errorMessage = error?.message || 'Failed to upload image';
    return res.status(500).json({ message: errorMessage });
  }
}
