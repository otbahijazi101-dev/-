import { NextResponse } from 'next/server';
import { validateUsername, usernameToInternalEmail } from '@/lib/auth';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminSupabaseClient, isSupabaseAdminConfigured } from '@/lib/supabase/admin';

function withError(request: Request, message: string) {
  const url = new URL('/login', request.url);
  url.searchParams.set('error', message);
  return NextResponse.redirect(url, { status: 303 });
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured) {
    return withError(request, 'لم يتم ربط قاعدة بيانات الراديو بعد.');
  }

  const formData = await request.formData();
  const rawIdentifier = String(formData.get('username') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  if (!rawIdentifier || !password) {
    return withError(request, 'اسم المستخدم أو البريد أو كلمة المرور غير صحيحة.');
  }

  const supabase = await createServerSupabaseClient();
  let email: string;

  if (rawIdentifier.includes('@')) {
    email = rawIdentifier.toLocaleLowerCase('en-US');
  } else {
    const usernameResult = validateUsername(rawIdentifier);
    if (!usernameResult.ok) {
      return withError(request, 'اسم المستخدم أو البريد أو كلمة المرور غير صحيحة.');
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', usernameResult.username)
      .maybeSingle();

    if (profile && isSupabaseAdminConfigured) {
      const admin = createAdminSupabaseClient();
      const { data: authUser, error: authUserError } = await admin.auth.admin.getUserById(profile.id);

      if (authUserError || !authUser.user?.email) {
        return withError(request, 'اسم المستخدم أو البريد أو كلمة المرور غير صحيحة.');
      }

      email = authUser.user.email;
    } else {
      email = usernameToInternalEmail(usernameResult.username);
    }
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    return withError(request, 'اسم المستخدم أو البريد أو كلمة المرور غير صحيحة.');
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
