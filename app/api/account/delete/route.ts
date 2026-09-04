import { NextResponse } from 'next/server';
import { createAdminSupabaseClient, isSupabaseAdminConfigured } from '@/lib/supabase/admin';
import { createServerSupabaseClient } from '@/lib/supabase/server';

function accountRedirect(request: Request, error: string) {
  const url = new URL('/account', request.url);
  url.searchParams.set('error', error);
  return NextResponse.redirect(url, { status: 303 });
}

function chunks<T>(items: T[], size = 100) {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) result.push(items.slice(index, index + size));
  return result;
}

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL('/login', request.url), { status: 303 });
  if (!user.email || !isSupabaseAdminConfigured) return accountRedirect(request, 'update_failed');

  const formData = await request.formData();
  const currentPassword = String(formData.get('current_password') ?? '');
  const confirmation = String(formData.get('confirmation') ?? '').trim();
  if (confirmation !== 'حذف حسابي') return accountRedirect(request, 'delete_confirmation');

  const { error: verifyError } = await supabase.auth.signInWithPassword({ email: user.email, password: currentPassword });
  if (verifyError) return accountRedirect(request, 'current_password');

  const admin = createAdminSupabaseClient();
  const { data: profile } = await admin
    .from('profiles')
    .select('role, status')
    .eq('id', user.id)
    .maybeSingle();

  if (profile?.role === 'admin' && profile?.status === 'active') {
    const { count } = await admin
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'admin')
      .eq('status', 'active');

    if ((count ?? 0) <= 1) return accountRedirect(request, 'last_admin');
  }

  const { data: tracks, error: tracksError } = await admin
    .from('tracks')
    .select('storage_path, cover_path')
    .eq('owner_id', user.id);
  if (tracksError) return accountRedirect(request, 'update_failed');

  const audioPaths = (tracks ?? []).map((track) => track.storage_path).filter(Boolean) as string[];
  const coverPaths = (tracks ?? []).map((track) => track.cover_path).filter(Boolean) as string[];

  for (const batch of chunks(audioPaths)) {
    const { error } = await admin.storage.from('audio').remove(batch);
    if (error) return accountRedirect(request, 'update_failed');
  }
  for (const batch of chunks(coverPaths)) {
    const { error } = await admin.storage.from('covers').remove(batch);
    if (error) return accountRedirect(request, 'update_failed');
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
  if (deleteError) return accountRedirect(request, 'update_failed');

  const response = NextResponse.redirect(new URL('/', request.url), { status: 303 });
  return response;
}
