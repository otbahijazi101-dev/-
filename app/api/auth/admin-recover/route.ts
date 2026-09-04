import { createHash, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { createAdminSupabaseClient, isSupabaseAdminConfigured } from '@/lib/supabase/admin';

const RECOVERY_TOKEN_HASH = 'a8dbde466a3c70c94479904ad46fef5f566f4cd22772abe971c2d33c8fb2f92d';
const RECOVERY_EXPIRES_AT = Date.parse('2026-09-04T11:30:00Z');

function validToken(token: string) {
  if (!token || Date.now() > RECOVERY_EXPIRES_AT) return false;
  const actual = Buffer.from(createHash('sha256').update(token).digest('hex'));
  const expected = Buffer.from(RECOVERY_TOKEN_HASH);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function back(request: Request, token: string, error: string) {
  const url = new URL('/admin-recover', request.url);
  url.searchParams.set('token', token);
  url.searchParams.set('error', error);
  return NextResponse.redirect(url, { status: 303 });
}

export async function POST(request: Request) {
  if (!isSupabaseAdminConfigured) {
    return back(request, '', 'تعذر الاتصال بخدمة الإدارة الآن.');
  }

  const formData = await request.formData();
  const token = String(formData.get('token') ?? '');
  const password = String(formData.get('password') ?? '');
  const confirmPassword = String(formData.get('confirmPassword') ?? '');

  if (!validToken(token)) {
    return back(request, '', 'رابط الاستعادة غير صالح أو انتهت صلاحيته.');
  }
  if (password.length < 10) {
    return back(request, token, 'كلمة المرور يجب أن تكون 10 أحرف على الأقل.');
  }
  if (password !== confirmPassword) {
    return back(request, token, 'كلمتا المرور غير متطابقتين.');
  }

  const admin = createAdminSupabaseClient();
  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('id')
    .eq('username', 'otbahijazi')
    .eq('role', 'admin')
    .eq('status', 'active')
    .maybeSingle();

  if (profileError || !profile) {
    return back(request, token, 'تعذر العثور على حساب الأدمن النشط.');
  }

  const { error: updateError } = await admin.auth.admin.updateUserById(profile.id, { password });
  if (updateError) {
    return back(request, token, 'تعذر تغيير كلمة المرور الآن. حاول مرة أخرى.');
  }

  const login = new URL('/login', request.url);
  login.searchParams.set('reset', '1');
  return NextResponse.redirect(login, { status: 303 });
}
