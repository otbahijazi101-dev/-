import { NextResponse } from 'next/server';
import { createAdminSupabaseClient, isSupabaseAdminConfigured } from '@/lib/supabase/admin';
import { createServerSupabaseClient } from '@/lib/supabase/server';

function adminRedirect(request: Request, state: string) {
  const url = new URL('/admin', request.url);
  url.searchParams.set('action', state);
  return NextResponse.redirect(url, { status: 303 });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const formData = await request.formData();
  const action = String(formData.get('action') ?? '');
  const reason = String(formData.get('reason') ?? '').trim().slice(0, 300);

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL('/login', request.url), { status: 303 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, status')
    .eq('id', user.id)
    .maybeSingle();

  if (profile?.role !== 'admin' || profile?.status !== 'active') {
    return new NextResponse('Forbidden', { status: 403 });
  }
  if (!isSupabaseAdminConfigured) return adminRedirect(request, 'error');

  const admin = createAdminSupabaseClient();

  if (action === 'publish') {
    const { error } = await admin
      .from('tracks')
      .update({ status: 'published', published_at: new Date().toISOString(), rejection_reason: null })
      .eq('id', id);
    return adminRedirect(request, error ? 'error' : 'published');
  }

  if (action === 'reject') {
    const { error } = await admin
      .from('tracks')
      .update({ status: 'rejected', published_at: null, rejection_reason: reason || 'لم تتم الموافقة على الملف.' })
      .eq('id', id);
    return adminRedirect(request, error ? 'error' : 'rejected');
  }

  if (action === 'delete') {
    const { data: track, error: trackError } = await admin
      .from('tracks')
      .select('storage_path, cover_path')
      .eq('id', id)
      .maybeSingle();
    if (trackError || !track) return adminRedirect(request, 'error');

    const { error: deleteError } = await admin.from('tracks').delete().eq('id', id);
    if (deleteError) return adminRedirect(request, 'error');

    if (track.storage_path) await admin.storage.from('audio').remove([track.storage_path]);
    if (track.cover_path) await admin.storage.from('covers').remove([track.cover_path]);
    return adminRedirect(request, 'deleted');
  }

  return new NextResponse('Bad Request', { status: 400 });
}
