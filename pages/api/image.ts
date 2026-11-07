import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { mayViewImage } from '@/lib/db';
import { getCloudflareEnv } from '@/lib/cloudflare';
import { imageUrlForKey, verifyImageSignature } from '@/lib/blob';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return res.status(405).end();
  const { key, expires, signature } = req.query;
  if (typeof key !== 'string' || key.length > 512 || key.includes('..') || !/^(users\/[^/]+\/|legacy\/)/.test(key)) return res.status(400).end();
  let allowed = typeof expires === 'string' && typeof signature === 'string' && await verifyImageSignature(key, expires, signature);
  if (!allowed) {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.id) return res.status(401).end();
    const url = imageUrlForKey(key);
    if (key.startsWith(`users/${session.user.id}/`) && !key.includes('/result-orig-')) {
      allowed = true;
    } else {
      // Never authorize a locked clean original solely through originalImageUrl.
      allowed = await mayViewImage(url, session.user.id);
    }
  }
  if (!allowed) return res.status(403).end();
  if (req.method === 'HEAD') {
    const metadata = await getCloudflareEnv().IMAGES_BUCKET.head(key);
    if (!metadata) return res.status(404).end();
    res.setHeader('Content-Type', metadata.httpMetadata?.contentType || 'image/jpeg');
    res.setHeader('Content-Length', metadata.size);
    res.setHeader('Cache-Control', 'private, max-age=300');
    return res.status(200).end();
  }
  const object = await getCloudflareEnv().IMAGES_BUCKET.get(key);
  if (!object) return res.status(404).end();
  res.setHeader('Content-Type', object.httpMetadata?.contentType || 'image/jpeg');
  res.setHeader('Cache-Control', 'private, max-age=300');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Length', object.size);
  for await (const chunk of object.body) res.write(Buffer.from(chunk));
  res.end();
}
