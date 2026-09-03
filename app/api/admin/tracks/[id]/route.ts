import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

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

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') return new NextResponse('Forbidden', { status: 403 });

  if (action === 'publish') {
    await supabase
      .from('tracks')
      .update({ status: 'published', published_at: new Date().toISOString(), rejection_reason: null })
      .eq('id', id);
  } else if (action === 'reject') {
    await supabase
      .from('tracks')
      .update({ status: 'rejected', published_at: null, rejection_reason: reason || 'لم تتم الموافقة على الملف.' })
      .eq('id', id);
  } else if (action === 'delete') {
    const { data: track } = await supabase.from('tracks').select('storage_path').eq('id', id).single();
    if (track?.storage_path) await supabase.storage.from('audio').remove([track.storage_path]);
    await supabase.from('tracks').delete().eq('id', id);
  }

  return NextResponse.redirect(new URL('/admin', request.url), { status: 303 });
}
