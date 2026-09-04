import { NextResponse } from 'next/server';
import { validateUsername } from '@/lib/auth';
import { createAdminSupabaseClient, isSupabaseAdminConfigured } from '@/lib/supabase/admin';
import { createServerSupabaseClient } from '@/lib/supabase/server';

function accountRedirect(request: Request, params: Record<string, string>) {
  const url = new URL('/account', request.url);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return NextResponse.redirect(url, { status: 303 });
}

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL('/login', request.url), { status: 303 });

  const formData = await request.formData();
  const action = String(formData.get('action') ?? '');

  if (action === 'password') {
    const currentPassword = String(formData.get('current_password') ?? '');
    const newPassword = String(formData.get('new_password') ?? '');
    const confirmPassword = String(formData.get('confirm_password') ?? '');

    if (newPassword.length < 8) return accountRedirect(request, { error: 'password_short' });
    if (newPassword !== confirmPassword) return accountRedirect(request, { error: 'password_match' });
    if (!user.email) return accountRedirect(request, { error: 'update_failed' });

    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });
    if (verifyError) return accountRedirect(request, { error: 'current_password' });

    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    if (updateError) return accountRedirect(request, { error: 'update_failed' });

    return accountRedirect(request, { password: 'saved' });
  }

  if (action === 'username') {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, status, username')
      .eq('id', user.id)
      .maybeSingle();

    if (profile?.role !== 'admin' || profile?.status !== 'active') {
      return accountRedirect(request, { error: 'forbidden' });
    }

    const usernameResult = validateUsername(String(formData.get('username') ?? ''));
    if (!usernameResult.ok) return accountRedirect(request, { error: 'username_invalid' });
    if (!isSupabaseAdminConfigured) return accountRedirect(request, { error: 'update_failed' });

    const username = usernameResult.username;
    if (username === profile.username) return accountRedirect(request, { username: 'saved' });

    const admin = createAdminSupabaseClient();
    const { data: existing } = await admin
      .from('profiles')
      .select('id')
      .eq('username', username)
      .neq('id', user.id)
      .maybeSingle();

    if (existing) return accountRedirect(request, { error: 'username_taken' });

    const { error: profileError } = await admin
      .from('profiles')
      .update({ username })
      .eq('id', user.id);
    if (profileError) return accountRedirect(request, { error: 'update_failed' });

    const { error: metadataError } = await admin.auth.admin.updateUserById(user.id, {
      user_metadata: { ...(user.user_metadata ?? {}), username },
    });

    if (metadataError) {
      await admin.from('profiles').update({ username: profile.username }).eq('id', user.id);
      return accountRedirect(request, { error: 'update_failed' });
    }

    return accountRedirect(request, { username: 'saved' });
  }

  return accountRedirect(request, { error: 'update_failed' });
}
