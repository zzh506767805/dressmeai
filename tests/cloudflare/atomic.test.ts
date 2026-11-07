import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import type { D1Database } from '@cloudflare/workers-types';
import { failJob, grantCheckout, reserveCredit } from '../../lib/atomic';
import { applyStripeEvent } from '../../lib/stripe-events';

async function fixture() {
  const mf = new Miniflare(convertV4MiniflareOptions({ name: 'test', modules: true, script: 'export default { fetch() { return new Response("ok") } }', d1Databases: ['DB'], compatibilityDate: '2026-11-07' }));
  const db = await mf.getD1Database('DB', 'test') as unknown as D1Database;
  const schema = readFileSync(new URL('../../prisma/d1-migrations/0001_initial.sql', import.meta.url), 'utf8');
  await db.batch(schema.replace(/^--.*$/gm, '').split(';').map(sql => sql.trim()).filter(Boolean).map(sql => db.prepare(sql)));
  await db.prepare(`INSERT INTO User (id, email, credits, updatedAt) VALUES ('alice', 'alice@example.test', 1, ?)`).bind(new Date().toISOString()).run();
  return { db, close: () => mf.dispose() };
}
const grant = { sessionId: 'cs_test_one', userId: 'alice', customerId: null, subscriptionId: null, plan: 'single', mode: 'payment', amount: 100, currency: 'usd', credits: 1 };

test('two simultaneous requests cannot spend the same final credit', async () => {
  const f = await fixture();
  try {
    const jobs = await Promise.all([reserveCredit(f.db, 'alice', 'request-first-0001'), reserveCredit(f.db, 'alice', 'request-second-0002')]);
    assert.equal(jobs.filter(Boolean).length, 1);
    assert.equal((await f.db.prepare('SELECT credits FROM User').first<any>()).credits, 0);
    assert.equal((await f.db.prepare('SELECT count(*) AS n FROM TryOnJob').first<any>()).n, 1);
  } finally { await f.close(); }
});

test('a repeated request creates one job, and repeated failures refund once', async () => {
  const f = await fixture();
  try {
    const ids = await Promise.all(Array.from({ length: 8 }, () => reserveCredit(f.db, 'alice', 'request-repeated-0001')));
    assert.ok(ids[0]); assert.ok(ids.every(id => id === ids[0]));
    await Promise.all(Array.from({ length: 8 }, () => failJob(f.db, ids[0]!, 'alice', 'failure')));
    assert.equal((await f.db.prepare('SELECT credits FROM User').first<any>()).credits, 1);
    assert.equal((await f.db.prepare('SELECT creditRefunded FROM TryOnJob').first<any>()).creditRefunded, 1);
  } finally { await f.close(); }
});

test('an expired subscription cannot reserve credits', async () => {
  const f = await fixture();
  try {
    await f.db.prepare("UPDATE User SET subscriptionStatus='BASIC', subscriptionExpiry=?").bind(new Date(Date.now() - 60000).toISOString()).run();
    assert.equal(await reserveCredit(f.db, 'alice', 'request-expired-0001'), null);
    assert.equal((await f.db.prepare('SELECT credits FROM User').first<any>()).credits, 1);
  } finally { await f.close(); }
});

test('a completed result cannot be failed or refunded by a stale client', async () => {
  const f = await fixture();
  try {
    const id = await reserveCredit(f.db, 'alice', 'request-complete-0001');
    await f.db.prepare("UPDATE TryOnJob SET status='COMPLETED' WHERE id=?").bind(id).run();
    assert.equal(await failJob(f.db, id!, 'alice', 'timeout'), false);
    assert.equal((await f.db.prepare('SELECT credits FROM User').first<any>()).credits, 0);
    assert.equal((await f.db.prepare('SELECT status FROM TryOnJob').first<any>()).status, 'COMPLETED');
  } finally { await f.close(); }
});

test('duplicate checkout notifications grant a single credit', async () => {
  const f = await fixture();
  try {
    const results = await Promise.all(Array.from({ length: 8 }, () => grantCheckout(f.db, grant)));
    assert.equal(results.filter(Boolean).length, 1);
    assert.equal((await f.db.prepare('SELECT credits FROM User').first<any>()).credits, 2);
    assert.equal((await f.db.prepare('SELECT count(*) AS n FROM Payment').first<any>()).n, 1);
  } finally { await f.close(); }
});

test('a database failure rolls back both payment and entitlement, and retry succeeds', async () => {
  const f = await fixture();
  try {
    const broken = new Proxy(f.db, { get(target, property) {
      if (property === 'batch') return (statements: any[]) => target.batch([...statements, target.prepare('INSERT INTO MissingTable VALUES (1)')]);
      const value = Reflect.get(target, property); return typeof value === 'function' ? value.bind(target) : value;
    } });
    await assert.rejects(() => grantCheckout(broken, grant));
    assert.equal((await f.db.prepare('SELECT count(*) AS n FROM Payment').first<any>()).n, 0);
    assert.equal((await f.db.prepare('SELECT credits FROM User').first<any>()).credits, 1);
    assert.equal(await grantCheckout(f.db, grant), true);
  } finally { await f.close(); }
});

test('subscription checkout replay preserves credits spent after the first grant', async () => {
  const f = await fixture();
  try {
    const subscription = { ...grant, mode: 'subscription', plan: 'Basic', subscriptionId: 'sub_test', credits: 50, subscriptionStatus: 'BASIC', subscriptionExpiry: Date.now() + 86400000 };
    await grantCheckout(f.db, subscription);
    await reserveCredit(f.db, 'alice', 'request-subscriber-001');
    assert.equal(await grantCheckout(f.db, subscription), false);
    assert.equal((await f.db.prepare('SELECT credits FROM User').first<any>()).credits, 49);
  } finally { await f.close(); }
});

test('unlock updates the existing result; a missing target falls back to a credit', async () => {
  const f = await fixture();
  try {
    const id = await reserveCredit(f.db, 'alice', 'request-unlock-0001');
    await f.db.prepare("UPDATE TryOnJob SET status='COMPLETED', resultImageUrl='preview', originalImageUrl='original' WHERE id=?").bind(id).run();
    await grantCheckout(f.db, { ...grant, unlock: { jobId: id!, imageUrl: 'original' } });
    assert.equal((await f.db.prepare('SELECT resultImageUrl FROM TryOnJob').first<any>()).resultImageUrl, 'original');
    assert.equal((await f.db.prepare('SELECT credits FROM User').first<any>()).credits, 0);
    await grantCheckout(f.db, { ...grant, sessionId: 'cs_test_missing', unlock: { jobId: 'missing', imageUrl: 'original' } });
    assert.equal((await f.db.prepare('SELECT credits FROM User').first<any>()).credits, 1);
  } finally { await f.close(); }
});

test('replaying a renewal event does not refill credits already spent', async () => {
  const f = await fixture();
  try {
    const mutation = { sql: 'UPDATE User SET credits = 50 WHERE id = ? AND {gate}', values: ['alice'] };
    assert.equal(await applyStripeEvent(f.db, 'evt_renewal', [mutation]), true);
    await reserveCredit(f.db, 'alice', 'request-renewal-0001');
    assert.equal(await applyStripeEvent(f.db, 'evt_renewal', [mutation]), false);
    assert.equal((await f.db.prepare('SELECT credits FROM User').first<any>()).credits, 49);
  } finally { await f.close(); }
});

test('an upload failure arriving after submission cannot cancel the AI task', async () => {
  const f = await fixture();
  try {
    const id = await reserveCredit(f.db, 'alice', 'request-racing-submit-01');
    await f.db.prepare("UPDATE TryOnJob SET status='PROCESSING' WHERE id=?").bind(id).run();
    assert.equal(await failJob(f.db, id!, 'alice', 'late upload error', 'PENDING'), false);
    assert.equal((await f.db.prepare('SELECT credits FROM User').first<any>()).credits, 0);
    assert.equal((await f.db.prepare('SELECT status FROM TryOnJob').first<any>()).status, 'PROCESSING');
  } finally { await f.close(); }
});
