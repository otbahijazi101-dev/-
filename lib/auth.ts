import { createHash } from 'node:crypto';

export function normalizeUsername(value: string) {
  return value.normalize('NFKC').trim().toLocaleLowerCase('en-US');
}

export function validateUsername(value: string) {
  const username = normalizeUsername(value);

  if (username.length < 3 || username.length > 30) {
    return { ok: false as const, error: 'اسم المستخدم يجب أن يكون بين 3 و30 حرفًا.' };
  }

  if (!/^[\p{L}\p{N}_.-]+$/u.test(username)) {
    return {
      ok: false as const,
      error: 'استخدم الحروف والأرقام والشرطة والنقطة والشرطة السفلية فقط.',
    };
  }

  return { ok: true as const, username };
}

export function usernameToInternalEmail(username: string) {
  const normalized = normalizeUsername(username);
  const digest = createHash('sha256').update(normalized).digest('hex');
  return `${digest}@users.radio.local`;
}
