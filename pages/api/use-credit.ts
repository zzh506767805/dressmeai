import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUser } from "@/lib/db";
import { reserveCredit } from '@/lib/atomic';
import { getCloudflareEnv } from '@/lib/cloudflare';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  const requestKey = req.headers['idempotency-key'];
  if (typeof requestKey !== 'string' || !/^[a-zA-Z0-9-]{16,80}$/.test(requestKey)) {
    return res.status(400).json({ message: 'Missing generation request key' });
  }
  const jobId = await reserveCredit(getCloudflareEnv().DB, session.user.id, requestKey);
  if (!jobId) {
    return res.status(403).json({ message: "No credits remaining" });
  }
  const user = await getUser(session.user.id);

  res.status(200).json({
    success: true,
    jobId,
    remainingCredits: user?.credits ?? 0,
  });
}
