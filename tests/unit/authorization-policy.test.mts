import assert from 'node:assert/strict';
import test from 'node:test';
import { roleMeetsMinimum } from '../../apps/web/src/lib/auth/authorization-policy.ts';
import { isValidCronSecret } from '../../apps/web/src/lib/auth/cron.ts';

test('roles grant only their level and lower permissions', () => {
  assert.equal(roleMeetsMinimum('owner', 'owner'), true);
  assert.equal(roleMeetsMinimum('owner', 'viewer'), true);
  assert.equal(roleMeetsMinimum('admin', 'editor'), true);
  assert.equal(roleMeetsMinimum('editor', 'viewer'), true);
  assert.equal(roleMeetsMinimum('viewer', 'editor'), false);
  assert.equal(roleMeetsMinimum('editor', 'admin'), false);
});

test('unknown roles and thresholds fail closed', () => {
  assert.equal(roleMeetsMinimum('unexpected', 'viewer'), false);
  assert.equal(roleMeetsMinimum('viewer', 'unexpected'), false);
  assert.equal(roleMeetsMinimum('', 'viewer'), false);
});

test('cron authorization rejects missing, short, and incorrect secrets', () => {
  const previousSecret = process.env.CRON_SECRET;

  try {
    delete process.env.CRON_SECRET;
    assert.equal(isValidCronSecret('x'.repeat(40)), false);

    process.env.CRON_SECRET = 'short';
    assert.equal(isValidCronSecret('short'), false);

    process.env.CRON_SECRET = 'a'.repeat(40);
    assert.equal(isValidCronSecret('b'.repeat(40)), false);
    assert.equal(isValidCronSecret('a'.repeat(40)), true);
  } finally {
    if (previousSecret === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = previousSecret;
  }
});