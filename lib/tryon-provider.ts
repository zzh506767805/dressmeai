import { getCloudflareEnv } from './cloudflare';
import { storedImageKey, readImageResponse, readImageBytes, signImageUrl } from './blob';
import { dashscope } from './jobs';

async function providerImage(url: string): Promise<string> {
  const response = storedImageKey(url) ? await readImageResponse(url)
    : await getCloudflareEnv().ASSETS.fetch(new Request(url) as any) as unknown as Response;
  if (!response.ok) throw new Error('Could not read the selected image');
  const bytes = await readImageBytes(response);
  const contentType = response.headers.get('Content-Type')?.split(';')[0] || 'image/jpeg';
  return `data:${contentType};base64,${bytes.toString('base64')}`;
}

export async function submitTryon(modelUrl: string, clothingUrl: string) {
  const model = process.env.TRYON_MODEL || 'wan2.7-image';
  if (model === 'aitryon' || model === 'aitryon-plus') {
    return dashscope('/api/v1/services/aigc/image2image/image-synthesis', {
      model, input: { person_image_url: await signImageUrl(modelUrl), top_garment_url: await signImageUrl(clothingUrl) },
      parameters: { resolution: -1, restore_face: true },
    });
  }
  if (model !== 'wan2.7-image' && model !== 'wan2.7-image-pro') throw new Error('Unsupported try-on model configuration');
  // Only previously authorized user inputs enter this helper. Inline images
  // keep R2 private and avoid machine-fetch blocking on development domains.
  const images = await Promise.all([providerImage(modelUrl), providerImage(clothingUrl)]);
  return dashscope('/api/v1/services/aigc/image-generation/generation', {
    model, input: { messages: [{ role: 'user', content: [
      { image: images[0] }, { image: images[1] },
      { text: 'Realistic virtual clothing try-on: keep the person in image 1 exactly recognizable, preserving their face, hair, body proportions, pose, background and framing. Replace only their upper garment with the exact garment from image 2, preserving its design, sleeves, collar, buttons, fabric, patterns, logos and color. Keep lower clothing unchanged. Natural fit, folds and lighting. One photorealistic portrait result, no collage, extra people or added text.' },
    ] }] }, parameters: { size: '2K', n: 1, watermark: false },
  });
}

