import { NextResponse } from 'next/server';
import { validateUsername, usernameToInternalEmail } from '@/lib/auth';
import { createAdminSupabaseClient, isSupabaseAdminConfigured } from '@/lib/supabase/admin';
import { createServerSupabaseClient } from '@/lib/supabase/server';

function withError(request: Request, message: string) {
  const url = new URL('/register', request.url);
  url.searchParams.set('error', message);
  return NextResponse.redirect(url, { status: 303 });
}

export async function POST(request: Request) {
  if (!isSupabaseAdminConfigured) {
    return withError(request, 'لم يتم ربط قاعدة بيانات SoundPalestine بعد.');
  }

  const formData = await request.formData();
  const displayName = String(formData.get('displayName') ?? '').trim();
  const rawUsername = String(formData.get('username') ?? '');
  const password = String(formData.get('password') ?? '');

  const usernameResult = validateUsername(rawUsername);
  if (!usernameResult.ok) return withError(request, usernameResult.error);
  if (password.length < 8) return withError(request, 'كلمة المرور يجب أن تكون 8 أحرف على الأقل.');
  if (displayName.length > 60) return withError(request, 'اسم العرض طويل جدًا.');

  const username = usernameResult.username;
  const internalEmail = usernameToInternalEmail(username);
  const admin = createAdminSupabaseClient();

  const { data: existing } = await admin
    .from('profiles')
    .select('id')
    .eq('username', username)
    .maybeSingle();

  if (existing) return withError(request, 'اسم المستخدم مستخدم بالفعل. اختر اسمًا آخر.');

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: internalEmail,
    password,
    email_confirm: true,
    user_metadata: { username },
  });

  if (createError || !created.user) {
    const duplicate = createError?.message.toLowerCase().includes('already') ?? false;
    return withError(request, duplicate ? 'اسم المستخدم مستخدم بالفعل.' : 'تعذر إنشاء الحساب الآن. حاول مرة أخرى.');
  }

  const { error: profileError } = await admin.from('profiles').insert({
    id: created.user.id,
    username,
    display_name: displayName || null,
  });

  if (profileError) {
    await admin.auth.admin.deleteUser(created.user.id);
    return withError(request, 'تعذر حفظ الحساب. حاول باسم مستخدم آخر.');
  }

  const supabase = await createServerSupabaseClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: internalEmail,
    password,
  });

  if (signInError) {
    return NextResponse.redirect(new URL('/login', request.url), { status: 303 });
  }

  return NextResponse.redirect(new URL('/', request.url), { status: 303 });
}
