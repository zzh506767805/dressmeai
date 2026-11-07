import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getJob, addSavedModel, getSavedModels, removeSavedModel, imageReferences } from '@/lib/db';
import { imageUrlForKey, deleteBlobByUrl } from '@/lib/blob';
import { getCloudflareEnv } from '@/lib/cloudflare';

export const config = { api: { bodyParser: false } };
const MAX_BYTES = 1024 * 1024;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) return res.status(401).json({ message: 'Not authenticated' });
  const jobId = req.headers['x-job-id'];
  const kind = req.headers['x-image-kind'];
  if (typeof jobId !== 'string' || !['model', 'clothing'].includes(String(kind))) return res.status(400).json({ message: 'Generation job and image slot are required' });
  const job = await getJob(jobId, session.user.id);
  if (!job || job.status !== 'PENDING') return res.status(403).json({ message: 'No pending generation job' });
  const key = `users/${session.user.id}/tryon-${jobId}-${kind}.jpg`;
  const url = imageUrlForKey(key);
  const bucket = getCloudflareEnv().IMAGES_BUCKET;
  if (await bucket.head(key)) return res.status(200).json({ url });
  if (req.headers['content-type'] !== 'image/jpeg') return res.status(415).json({ message: 'Please upload a JPEG image' });
  if (Number(req.headers['content-length']) > MAX_BYTES) return res.status(413).json({ message: 'Image is too large' });
  try {
    const parts: Buffer[] = [];
    let size = 0;
    for await (const part of req) {
      size += part.length;
      if (size > MAX_BYTES) return res.status(413).json({ message: 'Image is too large' });
      parts.push(Buffer.from(part));
    }
    const image = Buffer.concat(parts);
    if (image.length < 4 || image[0] !== 0xff || image[1] !== 0xd8 || image[2] !== 0xff) return res.status(400).json({ message: 'Invalid JPEG image' });
    await bucket.put(key, image, { httpMetadata: { contentType: 'image/jpeg' } });
    if (req.headers['x-save-as-model'] === 'true') {
      await addSavedModel(session.user.id, url);
      const excess = (await getSavedModels(session.user.id)).slice(3);
      for (const entry of excess) {
        const references = await imageReferences(entry.imageUrl);
        await removeSavedModel(entry.id, session.user.id);
        if (!references) await deleteBlobByUrl(entry.imageUrl);
      }
    }
    return res.status(200).json({ url });
  } catch (error) {
    console.error('Image upload failed', error instanceof Error ? error.message : 'unknown');
    return res.status(500).json({ message: 'Failed to upload image' });
  }
}
