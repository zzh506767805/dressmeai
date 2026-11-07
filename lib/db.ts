import type { User, TryOnJob, Payment, SavedModelImage } from '@prisma/client';
import { getCloudflareEnv } from './cloudflare';

export const getDatabase = () => getCloudflareEnv().DB;
export const dbDate = (date = new Date()) => date.toISOString().replace('Z', '+00:00');
export function parseDbDate(value: unknown): Date | null {
  if (value === null || value === undefined) return null;
  const text = String(value);
  return new Date(typeof value === 'number' ? value : /^\d{4}-\d{2}-\d{2} /.test(text) ? text.replace(' ', 'T') + 'Z' : text);
}
export function asUser(row: Record<string, unknown>): User {
  return { ...row, emailVerified: parseDbDate(row.emailVerified), subscriptionExpiry: parseDbDate(row.subscriptionExpiry), createdAt: parseDbDate(row.createdAt), updatedAt: parseDbDate(row.updatedAt) } as unknown as User;
}
function asJob(row: Record<string, unknown>): TryOnJob {
  return { ...row, creditRefunded: Boolean(row.creditRefunded), createdAt: parseDbDate(row.createdAt), updatedAt: parseDbDate(row.updatedAt) } as unknown as TryOnJob;
}
export async function getUser(id: string): Promise<User | null> {
  const row = await getDatabase().prepare('SELECT * FROM User WHERE id = ?').bind(id).first<Record<string, unknown>>();
  return row ? asUser(row) : null;
}
export async function getJob(id: string, userId: string): Promise<TryOnJob | null> {
  const row = await getDatabase().prepare('SELECT * FROM TryOnJob WHERE id = ? AND userId = ?').bind(id, userId).first<Record<string, unknown>>();
  return row ? asJob(row) : null;
}
export async function getPaymentBySession(id: string): Promise<Payment | null> {
  return getDatabase().prepare('SELECT * FROM Payment WHERE stripeSessionId = ?').bind(id).first<Payment>();
}
export async function getPaymentBySubscription(id: string): Promise<Payment | null> {
  return getDatabase().prepare('SELECT * FROM Payment WHERE stripeSubscriptionId = ? ORDER BY createdAt ASC LIMIT 1').bind(id).first<Payment>();
}
export async function getCustomerPayment(userId: string): Promise<Payment | null> {
  return getDatabase().prepare('SELECT * FROM Payment WHERE userId = ? AND stripeCustomerId IS NOT NULL ORDER BY createdAt DESC LIMIT 1').bind(userId).first<Payment>();
}
export async function hasPaid(userId: string): Promise<boolean> {
  return Boolean(await getDatabase().prepare("SELECT id FROM Payment WHERE userId = ? AND status = 'paid' LIMIT 1").bind(userId).first());
}
export async function getRecoverableJobs(): Promise<TryOnJob[]> {
  const { results } = await getDatabase().prepare("SELECT * FROM TryOnJob WHERE status IN ('PENDING','PROCESSING') ORDER BY updatedAt ASC LIMIT 4").all<Record<string, unknown>>();
  return results.map(asJob);
}
export async function claimJob(id: string, userId: string, modelUrl: string, clothingUrl: string): Promise<boolean> {
  const result = await getDatabase().prepare("UPDATE TryOnJob SET status='PROCESSING', modelImageUrl=?, clothImageUrl=?, updatedAt=? WHERE id=? AND userId=? AND status='PENDING' AND taskId IS NULL").bind(modelUrl, clothingUrl, dbDate(), id, userId).run();
  return Boolean(result.meta.changes);
}
export async function recordTask(id: string, taskId: string): Promise<void> {
  await getDatabase().prepare("UPDATE TryOnJob SET taskId=?, updatedAt=? WHERE id=? AND status='PROCESSING' AND creditRefunded=0").bind(taskId, dbDate(), id).run();
}
export async function completeJob(id: string, userId: string, imageUrl: string, originalUrl: string): Promise<boolean> {
  const result = await getDatabase().prepare("UPDATE TryOnJob SET status='COMPLETED', resultImageUrl=?, originalImageUrl=?, errorMessage=NULL, updatedAt=? WHERE id=? AND userId=? AND status='PROCESSING' AND creditRefunded=0").bind(imageUrl, originalUrl, dbDate(), id, userId).run();
  return Boolean(result.meta.changes);
}
export async function touchJob(id: string): Promise<void> {
  await getDatabase().prepare("UPDATE TryOnJob SET updatedAt=? WHERE id=? AND status IN ('PENDING','PROCESSING')").bind(dbDate(), id).run();
}
export async function getSavedModels(userId: string): Promise<SavedModelImage[]> {
  const { results } = await getDatabase().prepare('SELECT * FROM SavedModelImage WHERE userId=? ORDER BY createdAt DESC').bind(userId).all<Record<string, unknown>>();
  return results.map(row => ({ ...row, createdAt: parseDbDate(row.createdAt) }) as unknown as SavedModelImage);
}
export async function getSavedModel(id: string, userId: string): Promise<SavedModelImage | null> {
  return getDatabase().prepare('SELECT * FROM SavedModelImage WHERE id=? AND userId=?').bind(id, userId).first<SavedModelImage>();
}
export async function ownsSavedModel(url: string, userId: string): Promise<boolean> {
  return Boolean(await getDatabase().prepare('SELECT id FROM SavedModelImage WHERE imageUrl=? AND userId=? LIMIT 1').bind(url, userId).first());
}
export async function addSavedModel(userId: string, imageUrl: string): Promise<void> {
  await getDatabase().prepare('INSERT INTO SavedModelImage (id,userId,imageUrl,createdAt) VALUES (?,?,?,?)').bind(crypto.randomUUID(), userId, imageUrl, dbDate()).run();
}
export async function removeSavedModel(id: string, userId: string): Promise<void> {
  await getDatabase().prepare('DELETE FROM SavedModelImage WHERE id=? AND userId=?').bind(id, userId).run();
}
export async function imageReferences(url: string): Promise<number> {
  return (await getDatabase().prepare('SELECT count(*) AS n FROM TryOnJob WHERE modelImageUrl=? OR clothImageUrl=?').bind(url, url).first<{ n: number }>())!.n;
}
export async function mayViewImage(url: string, userId: string): Promise<boolean> {
  return Boolean(await getDatabase().prepare(`SELECT id FROM SavedModelImage WHERE userId=? AND imageUrl=?
    UNION ALL SELECT id FROM TryOnJob WHERE userId=? AND (resultImageUrl=? OR modelImageUrl=? OR clothImageUrl=?) LIMIT 1`).bind(userId, url, userId, url, url, url).first());
}
export async function getHistory(userId: string, page: number) {
  const db = getDatabase();
  const [data, count] = await Promise.all([
    db.prepare('SELECT id,resultImageUrl,status,createdAt FROM TryOnJob WHERE userId=? ORDER BY createdAt DESC LIMIT 20 OFFSET ?').bind(userId, (page - 1) * 20).all(),
    db.prepare('SELECT count(*) AS n FROM TryOnJob WHERE userId=?').bind(userId).first<{ n: number }>(),
  ]);
  return { jobs: data.results, total: count!.n, page, totalPages: Math.ceil(count!.n / 20) };
}
