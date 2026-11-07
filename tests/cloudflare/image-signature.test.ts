import { test } from 'node:test';
import assert from 'node:assert/strict';
import { signImageUrl, verifyImageSignature, imageUrlForKey, storedImageKey } from '../../lib/blob';

test('image authorization expires and cannot be moved to another object', async () => {
  process.env.NEXTAUTH_SECRET = 'isolated-test-secret-not-a-real-credential';
  process.env.NEXT_PUBLIC_BASE_URL = 'https://example.test';
  const key = 'users/alice/tryon-test.jpg';
  const url = new URL(await signImageUrl(imageUrlForKey(key)));
  const expires = url.searchParams.get('expires')!;
  const signature = url.searchParams.get('signature')!;
  assert.equal(await verifyImageSignature(key, expires, signature), true);
  assert.equal(await verifyImageSignature('users/bob/tryon-test.jpg', expires, signature), false);
  assert.equal(await verifyImageSignature(key, String(Math.floor(Date.now() / 1000) - 1), signature), false);
  assert.equal(await verifyImageSignature(key, expires, signature.replace(/^./, signature[0] === 'a' ? 'b' : 'a')), false);
  assert.equal(storedImageKey('https://attacker.test/api/image?key=users/alice/test.jpg'), null);
});
