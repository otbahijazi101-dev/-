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

async function ownedFiles(admin: ReturnType<typeof createAdminSupabaseClient>, bucket: string, userId: string) {
  const paths: string[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await admin.storage.from(bucket).list(userId, { limit: 1000, offset });
    if (error) throw error;
    paths.push(...(data ?? []).filter((file) => file.id).map((file) => `${userId}/${file.name}`));
    if (!data || data.length < 1000) return paths;
  }
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

  try {
    // Supabase will not delete an auth user who still owns Storage objects.
    // Collect the whole user folder, including uploads that never became tracks.
    const [audioPaths, coverPaths] = await Promise.all([
      ownedFiles(admin, 'audio', user.id),
      ownedFiles(admin, 'covers', user.id),
    ]);

    // Remove public records first so nobody is sent to a file being deleted.
    const { error: tracksError } = await admin.from('tracks').delete().eq('owner_id', user.id);
    if (tracksError) return accountRedirect(request, 'update_failed');

    for (const batch of chunks(audioPaths)) {
      const { error } = await admin.storage.from('audio').remove(batch);
      if (error) return accountRedirect(request, 'delete_partial');
    }
    for (const batch of chunks(coverPaths)) {
      const { error } = await admin.storage.from('covers').remove(batch);
      if (error) return accountRedirect(request, 'delete_partial');
    }

    const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
    if (deleteError) return accountRedirect(request, 'delete_partial');
  } catch {
    return accountRedirect(request, 'update_failed');
  }

  return NextResponse.redirect(new URL('/', request.url), { status: 303 });
}
