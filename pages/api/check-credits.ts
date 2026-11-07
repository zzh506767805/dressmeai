import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUser, getDatabase, dbDate } from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end();
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) return res.status(401).json({ message: 'Not authenticated' });
  let user = await getUser(session.user.id);
  if (!user) return res.status(404).json({ message: 'User not found' });
  if (user.subscriptionStatus !== 'FREE' && user.subscriptionExpiry && user.subscriptionExpiry < new Date()) {
    // A renewal arriving after the read must not be erased by an expired snapshot.
    await getDatabase().prepare("UPDATE User SET subscriptionStatus='FREE',subscriptionExpiry=NULL,credits=0,updatedAt=? WHERE id=? AND subscriptionExpiry IS NOT NULL AND subscriptionExpiry<?").bind(dbDate(), user.id, dbDate()).run();
    user = (await getUser(user.id))!;
  }
  return res.status(200).json({ credits: user.credits, subscriptionStatus: user.subscriptionStatus, hasCredits: user.credits > 0 });
}
