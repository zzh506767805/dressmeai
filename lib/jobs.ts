import type { RequestInitCfPropertiesImage } from '@cloudflare/workers-types';
import { getJob, completeJob, getRecoverableJobs, touchJob } from './db';
import { getCloudflareEnv } from './cloudflare';
import { failJob } from './atomic';
import { imageUrlForKey, readImageResponse, readImageBytes, signImageUrl } from './blob';
import { isFreeUser } from './credits';

export async function dashscope(path: string, body?: unknown) {
  if (!process.env.ALIYUN_API_KEY) throw new Error('Missing AI service configuration');
  const response = await fetch(`https://dashscope.aliyuncs.com${path}`, {
    method: body ? 'POST' : 'GET',
    headers: { Authorization: `Bearer ${process.env.ALIYUN_API_KEY}`, 'Content-Type': 'application/json', ...(body ? { 'X-DashScope-Async': 'enable' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(body ? 120000 : 30000),
  });
  const data: any = await response.json();
  if (!response.ok) throw new Error([data.code, data.message].filter(Boolean).join(': ') || `AI service error ${response.status}`);
  return data;
}

export async function refreshJob(jobId: string, userId: string) {
  const job = await getJob(jobId, userId);
  if (!job) return null;
  if (job.status === 'COMPLETED') return { status: 'SUCCEEDED', imageUrl: job.resultImageUrl, watermarked: job.resultImageUrl?.includes('result-wm') ?? false };
  if (job.status === 'FAILED') return { status: 'FAILED', message: job.errorMessage };
  if (!job.taskId) return { status: 'PENDING' };
  const data = await dashscope(`/api/v1/tasks/${encodeURIComponent(job.taskId)}`);
  const output = data.output;
  if (!output?.task_status) throw new Error('Invalid AI status response');
  if (output.task_status === 'FAILED') {
    const message = [output.code, output.message].filter(Boolean).join(': ') || 'AI generation failed';
    await failJob(getCloudflareEnv().DB, jobId, userId, message);
    return { status: 'FAILED', message };
  }
  if (output.task_status !== 'SUCCEEDED' || !output.image_url) return { status: output.task_status };
  const env = getCloudflareEnv();
  const free = await isFreeUser(userId);
  const key = `users/${userId}/${free ? 'result-orig' : 'result'}-${jobId}.jpg`;
  const originalUrl = imageUrlForKey(key);
  if (!(await env.IMAGES_BUCKET.head(key))) {
    const original = await readImageResponse(output.image_url);
    await env.IMAGES_BUCKET.put(key, await readImageBytes(original), { httpMetadata: { contentType: original.headers.get('content-type') || 'image/jpeg' } });
  }
  let imageUrl = originalUrl;
  if (free) {
    const previewKey = `users/${userId}/result-wm-${jobId}.jpg`;
    if (!(await env.IMAGES_BUCKET.head(previewKey))) {
      // URL image transformations are available on Images Free. The native
      // processing runs outside Worker CPU; never expose an original on failure.
      const base = process.env.IMAGE_TRANSFORM_BASE_URL || process.env.NEXTAUTH_URL;
      const image: RequestInitCfPropertiesImage = { width: 768, height: 1024, fit: 'pad', format: 'jpeg', draw: [{ url: `${base}/images/result-lock-overlay.png`, width: 768, height: 1024, top: 0, left: 0 }] };
      const response = await fetch(await signImageUrl(originalUrl), { cf: { image } } as RequestInit);
      if (!response.ok || !response.headers.get('cf-resized')) throw new Error('Protected preview transformation unavailable');
      await env.IMAGES_BUCKET.put(previewKey, await readImageBytes(response), { httpMetadata: { contentType: 'image/jpeg' } });
    }
    imageUrl = imageUrlForKey(previewKey);
  }
  if (!(await completeJob(jobId, userId, imageUrl, originalUrl))) return refreshJob(jobId, userId);
  return { status: 'SUCCEEDED', imageUrl, watermarked: free };
}

export async function recoverJobs() {
  const jobs = await getRecoverableJobs();
  for (const job of jobs) {
    if (!job.userId) continue;
    try {
      if (job.taskId) {
        await refreshJob(job.id, job.userId);
      } else if (Date.now() - (job.status === 'PROCESSING' ? job.updatedAt : job.createdAt).getTime() > 15 * 60000) {
        await failJob(getCloudflareEnv().DB, job.id, job.userId, 'Generation did not start; credit refunded');
      }
    } catch (error) {
      console.error('[recovery]', job.id, error instanceof Error ? error.message : 'unknown');
      if (Date.now() - job.createdAt.getTime() > 24 * 3600000) {
        await failJob(getCloudflareEnv().DB, job.id, job.userId, 'Result recovery failed; credit refunded');
      }
    }
    if (job.taskId) await touchJob(job.id);
  }
  return jobs.length;
}
