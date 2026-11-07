// OpenNext generates this module during cf:build.
// @ts-ignore Generated output is deliberately not committed.
import nextWorker from './.open-next/worker.js';

const worker = {
  async fetch(request: Request, env: CloudflareEnv, ctx: unknown) {
    const url = new URL(request.url);
    if (url.hostname === 'www.dressmeai.com') {
      url.hostname = 'dressmeai.com'; url.protocol = 'https:';
      return Response.redirect(url.toString(), 308);
    }
    if (!url.pathname.startsWith('/api/')) {
      const assetUrl = new URL(request.url);
      if (!assetUrl.pathname.includes('.')) assetUrl.pathname = assetUrl.pathname.replace(/\/$/, '') + '/index.html';
      const asset = await env.ASSETS.fetch(new Request(assetUrl, request) as any);
      if (asset.status !== 404) {
        if (url.pathname !== '/' && url.pathname.endsWith('/')) {
          url.pathname = url.pathname.slice(0, -1);
          return Response.redirect(url.toString(), 308);
        }
        if (url.pathname.endsWith('/feed.xml')) {
          const headers = new Headers(asset.headers as any);
          headers.set('Content-Type', 'application/rss+xml; charset=utf-8');
          return new Response(asset.body as any, { status: asset.status, headers });
        }
        return asset;
      }
      const missingUrl = new URL(request.url);
      missingUrl.pathname = '/404/index.html';
      const missing = await env.ASSETS.fetch(new Request(missingUrl, request) as any);
      return new Response(missing.body as any, { status: 404, headers: missing.headers as any });
    }
    return nextWorker.fetch(request, env, ctx);
  },
  scheduled(_event: unknown, env: CloudflareEnv, ctx: { waitUntil(promise: Promise<unknown>): void }) {
    if (!env.RECOVERY_SECRET) return;
    ctx.waitUntil(nextWorker.fetch(new Request('https://internal/api/internal/recover', {
      method: 'POST', headers: { 'X-Recovery-Secret': env.RECOVERY_SECRET },
    }), env, ctx).then((response: Response) => {
      if (!response.ok) throw new Error(`Recovery failed: ${response.status}`);
    }));
  },
};

export default worker;
