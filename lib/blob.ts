import { getCloudflareEnv } from './cloudflare';

export function imageUrlForKey(key: string): string {
  return `${process.env.NEXTAUTH_URL || 'http://localhost:8787'}/api/image?key=${encodeURIComponent(key)}`;
}

export function storedImageKey(url: string): string | null {
  const base = process.env.NEXTAUTH_URL || 'http://localhost:8787';
  try {
    const parsed = new URL(url, base);
    if (parsed.origin !== new URL(base).origin || parsed.pathname !== '/api/image') return null;
    return parsed.searchParams.get('key');
  } catch { return null; }
}

export async function uploadImageBuffer(buffer: Buffer, prefix = 'tryon', userId?: string): Promise<string> {
  if (!userId) throw new Error('Image owner is required');
  const key = `users/${userId}/${prefix}-${crypto.randomUUID()}.jpg`;
  await getCloudflareEnv().IMAGES_BUCKET.put(key, buffer, { httpMetadata: { contentType: 'image/jpeg' } });
  return imageUrlForKey(key);
}

export async function deleteBlobByUrl(url: string): Promise<void> {
  const key = storedImageKey(url);
  if (key) await getCloudflareEnv().IMAGES_BUCKET.delete(key);
}

async function signingKey() {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error('Missing image signing secret');
  return crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

export async function signImageUrl(url: string): Promise<string> {
  const key = storedImageKey(url);
  if (!key) return url;
  const expires = String(Math.floor(Date.now() / 1000) + 3600);
  const signed = await crypto.subtle.sign('HMAC', await signingKey(), new TextEncoder().encode(`${key}\n${expires}`));
  const signature = Array.from(new Uint8Array(signed), byte => byte.toString(16).padStart(2, '0')).join('');
  return `${imageUrlForKey(key)}&expires=${expires}&signature=${signature}`;
}

export async function verifyImageSignature(key: string, expires: string, signature: string): Promise<boolean> {
  const expiry = Number(expires);
  if (!Number.isInteger(expiry) || expiry < Date.now() / 1000 || expiry > Date.now() / 1000 + 3600 || !/^[a-f0-9]{64}$/.test(signature)) return false;
  const bytes = Uint8Array.from(signature.match(/../g)!, value => parseInt(value, 16));
  return crypto.subtle.verify('HMAC', await signingKey(), bytes, new TextEncoder().encode(`${key}\n${expires}`));
}

export async function readImageResponse(url: string): Promise<Response> {
  const key = storedImageKey(url);
  if (key) {
    const object = await getCloudflareEnv().IMAGES_BUCKET.get(key);
    if (!object) throw new Error('Stored image is missing');
    return new Response(object.body as unknown as ReadableStream, { headers: { 'Content-Type': object.httpMetadata?.contentType || 'image/jpeg' } });
  }
  const parsed = new URL(url);
  const allowed = parsed.hostname === 'dressmeaiupload.blob.core.windows.net' || (/^dashscope-result-[a-z0-9-]+\.oss-cn-[a-z0-9-]+\.aliyuncs\.com$/.test(parsed.hostname) || /^dashscope-[a-z0-9-]+\.oss-accelerate\.aliyuncs\.com$/.test(parsed.hostname));
  if (!allowed || !['http:', 'https:'].includes(parsed.protocol)) throw new Error('Untrusted image source');
  const response = await fetch(url, { signal: AbortSignal.timeout(30000), redirect: 'manual' });
  if (!response.ok || !response.body) throw new Error(`Image download failed: ${response.status}`);
  return response;
}

export async function readImageBytes(response: Response): Promise<Buffer> {
  const maxBytes = 10 * 1024 * 1024;
  if (!response.body || Number(response.headers.get('content-length')) > maxBytes) throw new Error('Result image is too large');
  const reader = response.body.getReader();
  const chunks: Buffer[] = [];
  let length = 0;
  for (;;) {
    const part = await reader.read();
    if (part.done) break;
    length += part.value.byteLength;
    if (length > maxBytes) { await reader.cancel(); throw new Error('Result image is too large'); }
    chunks.push(Buffer.from(part.value));
  }
  return Buffer.concat(chunks, length);
}
