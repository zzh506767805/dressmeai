import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { createHmac, generateKeyPairSync, sign } from 'node:crypto';
import { Miniflare, convertV4MiniflareOptions, Log, LogLevel } from 'miniflare';

const schema = readFileSync('prisma/d1-migrations/0001_initial.sql', 'utf8');
const image = readFileSync('public/images/paywall-demo/model-base.jpg');
const protectedPreview = readFileSync('tests/cloudflare/protected-preview.jpg');
const timestamp = new Date().toISOString().replace('Z', '+00:00');
const json = (value: unknown) => new Response(JSON.stringify(value), { headers: { 'Content-Type': 'application/json' } });

test('built Worker: login session, image isolation, paid result, webhook replay and recovery', async () => {
  let aiSubmissions = 0;
  let failDownload = false;
  let allowPreviewTransform = false;
  let googleSubject = 'legacy-google-subject';
  const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const jwk = { ...publicKey.export({ format: 'jwk' }), kid: 'test-key', alg: 'RS256', use: 'sig' };
  const mf = new Miniflare(convertV4MiniflareOptions({
    log: new Log(LogLevel.DEBUG), name: 'app', modulesRoot: path.resolve('.wrangler/dry-run'),
    modules: [{ type: 'ESModule', path: path.resolve('.wrangler/dry-run/cloudflare-worker.js') }, ...readdirSync('.wrangler/dry-run').filter(file => file.endsWith('.wasm')).map(file => ({ type: 'CompiledWasm' as const, path: path.resolve('.wrangler/dry-run', file) }))],
    compatibilityDate: '2026-11-07', compatibilityFlags: ['nodejs_compat'],
    d1Databases: ['DB'], r2Buckets: ['IMAGES_BUCKET'],
    assets: { directory: path.resolve('.open-next/assets'), binding: 'ASSETS', run_worker_first: false, assetConfig: { html_handling: 'none', not_found_handling: 'none' } },
    bindings: { NEXT_PUBLIC_BASE_URL: 'https://example.test', NEXTAUTH_URL: 'https://example.test', NEXTAUTH_SECRET: 'runtime-test-secret', GOOGLE_CLIENT_ID: 'test-client', GOOGLE_CLIENT_SECRET: 'test-google-secret', STRIPE_SECRET_KEY: 'sk_test_synthetic', STRIPE_WEBHOOK_SECRET: 'whsec_synthetic', ALIYUN_API_KEY: 'synthetic-ai-key', RECOVERY_SECRET: 'synthetic-recovery-secret', DEPLOYMENT_STAGE: 'preview', TRYON_MODEL: 'wan2.7-image' },
    outboundService: async request => {
      const url = new URL(request.url);
      if (url.hostname === 'accounts.google.com') return json({ issuer: 'https://accounts.google.com', authorization_endpoint: 'https://accounts.google.com/o/oauth2/v2/auth', token_endpoint: 'https://oauth2.googleapis.com/token', userinfo_endpoint: 'https://openidconnect.googleapis.com/v1/userinfo', jwks_uri: 'https://www.googleapis.com/oauth2/v3/certs', response_types_supported: ['code'], subject_types_supported: ['public'], id_token_signing_alg_values_supported: ['RS256'], token_endpoint_auth_methods_supported: ['client_secret_post', 'client_secret_basic'], code_challenge_methods_supported: ['S256'] });
      if (url.hostname === 'www.googleapis.com') return json({ keys: [jwk] });
      if (url.hostname === 'oauth2.googleapis.com') {
        const now = Math.floor(Date.now()/1000);
        const header = Buffer.from(JSON.stringify({ alg: 'RS256', kid: 'test-key' })).toString('base64url');
        const payload = Buffer.from(JSON.stringify({ iss: 'https://accounts.google.com', aud: 'test-client', sub: googleSubject, email: `${googleSubject}@example.test`, email_verified: true, name: 'Test Google User', iat: now, exp: now + 3600 })).toString('base64url');
        const signature = sign('RSA-SHA256', Buffer.from(`${header}.${payload}`), privateKey).toString('base64url');
        return json({ access_token: 'synthetic-google-token', token_type: 'Bearer', expires_in: 3600, id_token: `${header}.${payload}.${signature}` });
      }
      if (url.hostname === 'dashscope.aliyuncs.com') {
        if (request.method === 'POST') {
          aiSubmissions++;
          const body: any = await request.json();
          const inputs = body.input.messages[0].content.filter((item: any) => item.image);
          assert.equal(inputs.length, 2);
          assert.ok(inputs.every((item: any) => item.image.startsWith('data:image/jpeg;base64,')));
          assert.equal(body.model, 'wan2.7-image');
          return json({ output: { task_id: `task_${aiSubmissions}` } });
        }
        return json({ output: { task_status: 'SUCCEEDED', choices: [{ message: { content: [{ type: 'image', image: 'https://dashscope-result-hz.oss-cn-hangzhou.aliyuncs.com/test.jpg' }] } }] } });
      }
      if (url.hostname.startsWith('dashscope-result-')) return failDownload ? new Response('temporarily unavailable', { status: 503 }) : new Response(image, { headers: { 'Content-Type': 'image/jpeg' } });
      if (url.hostname === 'example.test') {
        const signature = createHmac('sha256', 'runtime-test-secret').update(`${url.searchParams.get('key')}\n${url.searchParams.get('expires')}`).digest('hex');
        assert.equal(url.searchParams.get('signature'), signature);
        return new Response(allowPreviewTransform ? protectedPreview : 'unavailable', { status: allowPreviewTransform ? 200 : 503, headers: { 'Content-Type': 'image/jpeg', ...(allowPreviewTransform ? { 'cf-resized': 'internal=ok' } : {}) } });
      }
      if (url.hostname === 'api.stripe.com' && url.pathname.startsWith('/v1/subscriptions/')) return json({ id: 'sub_test', current_period_end: Math.floor(Date.now()/1000) + 365*86400, status: 'active' });
      if (url.hostname === 'api.stripe.com') return json({ id: 'cs_test_ready', object: 'checkout.session', mode: 'payment', payment_status: 'paid', amount_total: 100, currency: 'usd', metadata: { userId: 'alice' } });
      throw new Error(`Unexpected external request blocked: ${url.hostname}`);
    },
  }));
  try {
    const worker = await mf.getWorker('app');
    const db = await mf.getD1Database('DB', 'app');
    const bucket = await mf.getR2Bucket('IMAGES_BUCKET', 'app');
    await db.batch(schema.replace(/^--.*$/gm, '').split(';').map(sql => sql.trim()).filter(Boolean).map(sql => db.prepare(sql)));
    await db.batch([
      db.prepare("INSERT INTO User (id,email,credits,updatedAt) VALUES ('alice','alice@example.test',3,?)").bind(timestamp),
      db.prepare("INSERT INTO User (id,email,credits,updatedAt) VALUES ('bob','bob@example.test',1,?)").bind(timestamp),
      db.prepare("INSERT INTO Session (id,sessionToken,userId,expires,updatedAt) VALUES ('s1','alice-test-session','alice','2099-01-01T00:00:00.000+00:00',?)").bind(timestamp),
      db.prepare("INSERT INTO Session (id,sessionToken,userId,expires,updatedAt) VALUES ('s2','bob-test-session','bob','2099-01-01T00:00:00.000+00:00',?)").bind(timestamp),
      db.prepare("INSERT INTO Payment (id,userId,stripeSessionId,amount,status,updatedAt) VALUES ('p0','alice','cs_fixture',100,'paid',?)").bind(timestamp),
    ]);
    const call = (route: string, init: NonNullable<Parameters<typeof worker.fetch>[1]> = {}, user = 'alice') => worker.fetch(`https://example.test${route}`, { ...init, headers: { ...(init.headers as Record<string,string>), Cookie: `__Secure-next-auth.session-token=${user}-test-session` } });
    const home = await call('/'); assert.equal(home.status, 200, await home.clone().text()); assert.match(await home.text(), /DressMeAI/);
    assert.equal((await call('/zh-CN')).status, 200);
    assert.equal((await call('/pricing')).status, 200);
    const auth = await call('/api/auth/session'); assert.equal(auth.status, 200);
    const session: any = await auth.json(); assert.equal(session.user.id, 'alice'); assert.equal(session.user.credits, 3);
    assert.equal((await worker.fetch('https://example.test/api/check-credits')).status, 401);
    assert.equal((await call('/api/internal/recover', { method: 'POST' })).status, 401);
    const reserve = await call('/api/use-credit', { method: 'POST', headers: { 'Idempotency-Key': 'runtime-generation-0001' } });
    assert.equal(reserve.status, 200, await reserve.clone().text());
    const reservation: any = await reserve.json(); assert.equal(reservation.remainingCredits, 2);
    const up = await call('/api/upload', { method: 'POST', headers: { 'Content-Type': 'image/jpeg', 'X-Save-As-Model': 'true', 'X-Job-Id': reservation.jobId, 'X-Image-Kind': 'model' }, body: image });
    assert.equal(up.status, 200, await up.clone().text());
    const uploaded: any = await up.json(); const relative = new URL(uploaded.url).pathname + new URL(uploaded.url).search;
    assert.equal((await call(relative)).status, 200);
    assert.equal((await call(relative, {}, 'bob')).status, 403);
    assert.equal((await worker.fetch(`https://example.test${relative}`)).status, 401);
    const submit = () => call('/api/tryon', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jobId: reservation.jobId, modelImageUrl: uploaded.url, clothingImageUrl: uploaded.url }) });
    assert.equal((await submit()).status, 200); assert.equal((await submit()).status, 200); assert.equal(aiSubmissions, 1);
    failDownload = true;
    const waiting = await call(`/api/status?jobId=${reservation.jobId}`); assert.equal(waiting.status, 503);
    assert.equal((await db.prepare('SELECT status FROM TryOnJob WHERE id=?').bind(reservation.jobId).first<any>()).status, 'PROCESSING');
    failDownload = false;
    const recovered = await call('/api/internal/recover', { method: 'POST', headers: { 'X-Recovery-Secret': 'synthetic-recovery-secret' } }); assert.equal(recovered.status, 200, await recovered.clone().text());
    const completed: any = await (await call(`/api/status?jobId=${reservation.jobId}`)).json(); assert.equal(completed.status, 'SUCCEEDED');
    assert.equal((await call(`/api/status?jobId=${reservation.jobId}`, {}, 'bob')).status, 404);
    const file = await call(`/api/download-result?jobId=${reservation.jobId}`); assert.equal(file.status, 200); assert.match(file.headers.get('content-disposition')!, /attachment/); assert.equal((await file.arrayBuffer()).byteLength, image.byteLength);
    const event = { id: 'evt_test_ready', object: 'event', created: Math.floor(Date.now()/1000), type: 'checkout.session.completed', data: { object: { id: 'cs_test_ready', mode: 'payment', payment_status: 'paid', amount_total: 100, currency: 'usd', metadata: { userId: 'alice' } } } };
    const payload = JSON.stringify(event); const seconds = String(Math.floor(Date.now()/1000));
    const digest = createHmac('sha256', 'whsec_synthetic').update(`${seconds}.${payload}`).digest('hex');
    const webhook = () => call('/api/webhook', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Stripe-Signature': `t=${seconds},v1=${digest}` }, body: payload });
    assert.equal((await webhook()).status, 200); assert.equal((await webhook()).status, 200);
    assert.equal((await db.prepare('SELECT credits FROM User WHERE id=?').bind('alice').first<any>()).credits, 3);
    assert.equal((await call('/api/webhook', { method: 'POST', headers: { 'Stripe-Signature': 'invalid' }, body: payload })).status, 400);
    const verified = await call('/api/verify-payment?session_id=cs_test_ready'); assert.equal(verified.status, 200);
    assert.equal((await call('/api/verify-payment?session_id=cs_test_ready', {}, 'bob')).status, 403);
    assert.ok(await bucket.head(new URL(completed.imageUrl).searchParams.get('key')!));
    const sendEvent = async (type: string, id: string, object: unknown, created = Math.floor(Date.now()/1000)) => {
      const body = JSON.stringify({ id, object: 'event', created, type, data: { object } });
      const t = String(Math.floor(Date.now()/1000));
      const sig = createHmac('sha256', 'whsec_synthetic').update(`${t}.${body}`).digest('hex');
      const response = await call('/api/webhook', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Stripe-Signature': `t=${t},v1=${sig}` }, body });
      assert.equal(response.status, 200, await response.clone().text());
    };
    const bobReserved: any = await (await call('/api/use-credit', { method: 'POST', headers: { 'Idempotency-Key': 'runtime-free-preview-0001' } }, 'bob')).json();
    const bobUpload = await call('/api/upload', { method: 'POST', headers: { 'Content-Type': 'image/jpeg', 'X-Job-Id': bobReserved.jobId, 'X-Image-Kind': 'model' }, body: image }, 'bob');
    assert.equal(bobUpload.status, 200);
    const bobImage: any = await bobUpload.json();
    assert.equal((await call('/api/tryon', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jobId: bobReserved.jobId, modelImageUrl: bobImage.url, clothingImageUrl: bobImage.url }) }, 'bob')).status, 200);
    const freeWaiting = await call(`/api/status?jobId=${bobReserved.jobId}`, {}, 'bob'); assert.equal(freeWaiting.status, 503);
    const originalRoute = `/api/image?key=${encodeURIComponent(`users/bob/result-orig-${bobReserved.jobId}.jpg`)}`;
    assert.equal((await call(originalRoute, {}, 'bob')).status, 403);
    assert.equal((await call(originalRoute)).status, 403);
    allowPreviewTransform = true;
    const freeResult: any = await (await call(`/api/status?jobId=${bobReserved.jobId}`, {}, 'bob')).json();
    assert.equal(freeResult.status, 'SUCCEEDED'); assert.equal(freeResult.watermarked, true);
    const previewDownload = await call(`/api/download-result?jobId=${bobReserved.jobId}`, {}, 'bob');
    assert.ok((await previewDownload.arrayBuffer()).byteLength > 0);
    // Miniflare explicitly does not implement overlays. Pixel protection must
    // be verified against the real Cloudflare transform after R2 activation.
    assert.equal((await call(originalRoute, {}, 'bob')).status, 403);
    const submissionsBeforeUnlock = aiSubmissions;
    await sendEvent('checkout.session.completed', 'evt_legacy_unlock', { id: 'cs_test_legacy_unlock', mode: 'payment', payment_status: 'paid', metadata: { userId: 'bob', jobId: bobReserved.jobId } });
    assert.equal((await call(originalRoute, {}, 'bob')).status, 200); assert.equal(aiSubmissions, submissionsBeforeUnlock);

    await sendEvent('checkout.session.completed', 'evt_annual_checkout', { id: 'cs_test_annual', mode: 'subscription', payment_status: 'paid', subscription: 'sub_test', metadata: { userId: 'alice', planId: 'basic', cadence: 'annual' } });
    assert.equal((await db.prepare("SELECT credits FROM User WHERE id='alice'").first<any>()).credits, 600);
    await call('/api/use-credit', { method: 'POST', headers: { 'Idempotency-Key': 'runtime-annual-spend-0001' } });
    const eventCreated = Math.floor(Date.now()/1000);
    const periodEnd = eventCreated + 365*86400;
    await sendEvent('customer.subscription.updated', 'evt_sub_update', { id: 'sub_test', status: 'active', current_period_end: periodEnd, metadata: { userId: 'alice', planId: 'basic' } }, eventCreated);
    assert.equal((await db.prepare("SELECT credits FROM User WHERE id='alice'").first<any>()).credits, 599);
    const invoice = { id: 'in_test_annual', subscription: 'sub_test', billing_reason: 'subscription_cycle', amount_paid: 6990, currency: 'usd', lines: { data: [{ period: { start: eventCreated, end: periodEnd } }] } };
    await sendEvent('invoice.payment_succeeded', 'evt_renewal_first', invoice, eventCreated);
    await call('/api/use-credit', { method: 'POST', headers: { 'Idempotency-Key': 'runtime-renewal-spend-0001' } });
    await sendEvent('invoice.payment_succeeded', 'evt_renewal_different_id', invoice, eventCreated);
    assert.equal((await db.prepare("SELECT credits FROM User WHERE id='alice'").first<any>()).credits, 599);
    assert.equal((await db.prepare("SELECT count(*) AS n FROM Payment WHERE stripeSessionId='invoice:in_test_annual'").first<any>()).n, 1);
    await sendEvent('customer.subscription.deleted', 'evt_old_delete', { id: 'sub_test' }, eventCreated - 86400);
    assert.equal((await db.prepare("SELECT subscriptionStatus FROM User WHERE id='alice'").first<any>()).subscriptionStatus, 'BASIC');
    await sendEvent('customer.subscription.deleted', 'evt_new_delete', { id: 'sub_test' }, eventCreated + 1);
    assert.equal((await db.prepare("SELECT credits FROM User WHERE id='alice'").first<any>()).credits, 0);
    // Preserve an imported Google account and its remaining credits, then
    // exercise new-user creation through the actual OAuth callback handler.
    await db.batch([
      db.prepare("INSERT INTO User (id,email,credits,updatedAt) VALUES ('legacy-cuid-user','legacy-google-subject@example.test',7,?)").bind(timestamp),
      db.prepare("INSERT INTO Account (id,userId,type,provider,providerAccountId,updatedAt) VALUES ('legacy-account','legacy-cuid-user','oauth','google','legacy-google-subject',?)").bind(timestamp),
    ]);
    const oauthLogin = async () => {
      const jar = new Map<string,string>();
      const remember = (response: { headers: { get(name: string): string | null } }) => {
        const raw = response.headers.get('set-cookie') || '';
        for (const match of Array.from(raw.matchAll(/((?:__Secure-|__Host-)?next-auth\.[a-z0-9._-]+)=([^;, ]*)/gi))) jar.set(match[1], match[2]);
      };
      const cookie = () => Array.from(jar, ([key,value]) => `${key}=${value}`).join('; ');
      const csrfResponse = await worker.fetch('https://example.test/api/auth/csrf'); remember(csrfResponse);
      const csrf: any = await csrfResponse.json();
      const signin = await worker.fetch('https://example.test/api/auth/signin/google', { method: 'POST', headers: { Cookie: cookie(), 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ csrfToken: csrf.csrfToken, callbackUrl: 'https://example.test/', json: 'true' }).toString() });
      remember(signin); const redirect: any = await signin.json();
      const state = new URL(redirect.url).searchParams.get('state'); assert.ok(state);
      const callback = await worker.fetch(`https://example.test/api/auth/callback/google?code=synthetic-code&state=${encodeURIComponent(state!)}`, { headers: { Cookie: cookie() }, redirect: 'manual' });
      assert.equal(callback.status, 302); remember(callback);
      const loggedIn = await worker.fetch('https://example.test/api/auth/session', { headers: { Cookie: cookie() } });
      const session: any = await loggedIn.json(); assert.ok(session.user, callback.headers.get('location') || 'No session');
      return session.user;
    };
    const legacyLogin = await oauthLogin(); assert.equal(legacyLogin.id, 'legacy-cuid-user'); assert.equal(legacyLogin.credits, 7);
    googleSubject = 'new-google-subject';
    const newLogin = await oauthLogin(); assert.equal(newLogin.credits, 0); assert.equal(newLogin.subscriptionStatus, 'FREE');
    assert.equal((await db.prepare("SELECT userId FROM Account WHERE providerAccountId='new-google-subject'").first<any>()).userId, newLogin.id);
    console.log('Runtime checks passed: pages, D1 sessions, upload isolation, one AI submission, storage retry, recovery, download, payment replay and signature rejection. Imported Google login and new Google registration also passed. No external services were contacted.');
  } finally { await mf.dispose(); }
});
