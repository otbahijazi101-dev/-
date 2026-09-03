import { NextResponse } from 'next/server';
import { validateUsername, usernameToInternalEmail } from '@/lib/auth';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { createServerSupabaseClient } from '@/lib/supabase/server';

function withError(request: Request, message: string) {
  const url = new URL('/login', request.url);
  url.searchParams.set('error', message);
  return NextResponse.redirect(url, { status: 303 });
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured) {
    return withError(request, 'لم يتم ربط قاعدة بيانات SoundPalestine بعد.');
  }

  const formData = await request.formData();
  const rawUsername = String(formData.get('username') ?? '');
  const password = String(formData.get('password') ?? '');
  const usernameResult = validateUsername(rawUsername);

  if (!usernameResult.ok || !password) {
    return withError(request, 'اسم المستخدم أو كلمة المرور غير صحيحة.');
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: usernameToInternalEmail(usernameResult.username),
    password,
  });

  if (error || !data.user) {
    return withError(request, 'اسم المستخدم أو كلمة المرور غير صحيحة.');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('status')
    .eq('id', data.user.id)
    .maybeSingle();

  if (profile?.status === 'suspended') {
    await supabase.auth.signOut();
    return withError(request, 'هذا الحساب موقوف حاليًا.');
  }

  return NextResponse.redirect(new URL('/', request.url), { status: 303 });
}
