import type { D1Database } from '@cloudflare/workers-types';

export async function reserveCredit(db: D1Database, userId: string, requestKey: string) {
  const existing = await db.prepare('SELECT id, userId FROM TryOnJob WHERE requestKey = ?').bind(requestKey).first<{ id: string; userId: string }>();
  if (existing) return existing.userId === userId ? existing.id : null;
  const id = crypto.randomUUID();
  const now = new Date().toISOString().replace('Z', '+00:00');
  const result = await db.batch([
    db.prepare(`INSERT OR IGNORE INTO TryOnJob (id, userId, requestKey, status, creditRefunded, createdAt, updatedAt)
      SELECT ?, id, ?, 'PENDING', 0, ?, ? FROM User
      WHERE id = ? AND credits > 0 AND (subscriptionStatus = 'FREE' OR subscriptionExpiry IS NULL OR subscriptionExpiry > ?)`)
      .bind(id, requestKey, now, now, userId, now),
    db.prepare('UPDATE User SET credits = credits - 1, updatedAt = ? WHERE id = ? AND EXISTS (SELECT 1 FROM TryOnJob WHERE id = ?)').bind(now, userId, id),
  ]);
  if (result[0].meta.changes) return id;
  const retry = await db.prepare('SELECT id, userId FROM TryOnJob WHERE requestKey = ?').bind(requestKey).first<{ id: string; userId: string }>();
  return retry?.userId === userId ? retry.id : null;
}

export async function failJob(db: D1Database, jobId: string, userId: string, message: string, expectedStatus?: 'PENDING' | 'PROCESSING'): Promise<boolean> {
  const now = new Date().toISOString().replace('Z', '+00:00');
  const result = await db.batch([
    db.prepare(`UPDATE TryOnJob SET status = 'FAILED', errorMessage = ?, updatedAt = ?
      WHERE id = ? AND userId = ? AND status IN ('PENDING', 'PROCESSING')
      AND (? IS NULL OR status = ?)`).bind(message, now, jobId, userId, expectedStatus ?? null, expectedStatus ?? null),
    db.prepare(`UPDATE User SET credits = credits + 1, updatedAt = ? WHERE id = ?
      AND EXISTS (SELECT 1 FROM TryOnJob WHERE id = ? AND userId = ? AND status = 'FAILED' AND creditRefunded = 0)`).bind(now, userId, jobId, userId),
    db.prepare(`UPDATE TryOnJob SET creditRefunded = 1, updatedAt = ?
      WHERE id = ? AND userId = ? AND status = 'FAILED' AND creditRefunded = 0`).bind(now, jobId, userId),
  ]);
  return Boolean(result[1].meta.changes);
}

export async function refundFailedJob(db: D1Database, jobId: string, userId: string): Promise<boolean> {
  const now = new Date().toISOString().replace('Z', '+00:00');
  const result = await db.batch([
    db.prepare(`UPDATE User SET credits = credits + 1, updatedAt = ? WHERE id = ?
      AND EXISTS (SELECT 1 FROM TryOnJob WHERE id = ? AND userId = ? AND status = 'FAILED' AND creditRefunded = 0)`).bind(now, userId, jobId, userId),
    db.prepare(`UPDATE TryOnJob SET creditRefunded = 1, updatedAt = ? WHERE id = ? AND userId = ? AND status = 'FAILED' AND creditRefunded = 0`).bind(now, jobId, userId),
  ]);
  return Boolean(result[0].meta.changes);
}

export interface CheckoutGrant {
  sessionId: string; userId: string; customerId: string | null; subscriptionId: string | null;
  plan: string; mode: string; amount: number; currency: string;
  credits: number; subscriptionStatus?: string; subscriptionExpiry?: number;
  unlock?: { jobId: string; imageUrl: string };
}

export async function grantCheckout(db: D1Database, grant: CheckoutGrant): Promise<boolean> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString().replace('Z', '+00:00');
  const gate = 'EXISTS (SELECT 1 FROM Payment WHERE id = ?)';
  const statements = [db.prepare(`INSERT INTO Payment (id, userId, stripeSessionId, stripeCustomerId, stripeSubscriptionId, plan, mode, status, amount, currency, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'paid', ?, ?, ?, ?) ON CONFLICT(stripeSessionId) DO NOTHING`)
    .bind(id, grant.userId, grant.sessionId, grant.customerId, grant.subscriptionId, grant.plan, grant.mode, grant.amount, grant.currency, now, now)];
  if (grant.subscriptionStatus) {
    statements.push(db.prepare(`UPDATE User SET subscriptionStatus = ?, subscriptionExpiry = ?, credits = ?, updatedAt = ? WHERE id = ? AND ${gate}`)
      .bind(grant.subscriptionStatus, grant.subscriptionExpiry ? new Date(grant.subscriptionExpiry).toISOString().replace('Z', '+00:00') : null, grant.credits, now, grant.userId, id));
  } else if (grant.unlock) {
    statements.push(db.prepare(`UPDATE TryOnJob SET resultImageUrl = ?, originalImageUrl = ?, updatedAt = ?
      WHERE id = ? AND userId = ? AND status = 'COMPLETED' AND ${gate}`)
      .bind(grant.unlock.imageUrl, grant.unlock.imageUrl, now, grant.unlock.jobId, grant.userId, id));
    // If the job was removed between preparation and commit, still deliver a credit.
    statements.push(db.prepare(`UPDATE User SET credits = credits + 1, updatedAt = ? WHERE id = ? AND ${gate}
      AND NOT EXISTS (SELECT 1 FROM TryOnJob WHERE id = ? AND userId = ? AND status = 'COMPLETED' AND resultImageUrl = ?)`)
      .bind(now, grant.userId, id, grant.unlock.jobId, grant.userId, grant.unlock.imageUrl));
  } else {
    statements.push(db.prepare(`UPDATE User SET credits = credits + ?, updatedAt = ? WHERE id = ? AND ${gate}`)
      .bind(grant.credits, now, grant.userId, id));
  }
  const result = await db.batch(statements);
  return Boolean(result[0].meta.changes);
}
