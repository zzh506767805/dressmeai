import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSavedModels, getSavedModel, removeSavedModel, imageReferences } from '@/lib/db';
import { deleteBlobByUrl } from '@/lib/blob';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!['GET', 'DELETE'].includes(req.method || '')) return res.status(405).end();
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) return res.status(401).json({ message: 'Not authenticated' });
  if (req.method === 'GET') return res.status(200).json({ images: await getSavedModels(session.user.id) });
  const id = req.query.id;
  if (typeof id !== 'string') return res.status(400).json({ message: 'Missing id' });
  const image = await getSavedModel(id, session.user.id);
  if (!image) return res.status(404).json({ message: 'Not found' });
  await removeSavedModel(id, session.user.id);
  if (!(await imageReferences(image.imageUrl))) await deleteBlobByUrl(image.imageUrl);
  return res.status(200).json({ success: true });
}
