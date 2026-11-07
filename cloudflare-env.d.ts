interface CloudflareEnv {
  DB: import('@cloudflare/workers-types').D1Database;
  IMAGES_BUCKET: import('@cloudflare/workers-types').R2Bucket;
  ASSETS: import('@cloudflare/workers-types').Fetcher;
  RECOVERY_SECRET: string;
  NEXTAUTH_SECRET: string;
  NEXT_PUBLIC_BASE_URL: string;
  NEXTAUTH_URL: string;
  DEPLOYMENT_STAGE: string;
}
