import { timingSafeEqual } from 'node:crypto';

export function isValidCronSecret(candidate: string | undefined): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected || expected.length < 32 || !candidate) return false;

  const expectedBytes = Buffer.from(expected, 'utf8');
  const candidateBytes = Buffer.from(candidate, 'utf8');
  if (expectedBytes.length !== candidateBytes.length) return false;

  return timingSafeEqual(expectedBytes, candidateBytes);
}