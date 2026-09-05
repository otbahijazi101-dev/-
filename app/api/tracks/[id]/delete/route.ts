import { NextResponse } from 'next/server';
import { createAdminSupabaseClient, isSupabaseAdminConfigured } from '@/lib/supabase/admin';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL('/login', request.url), { status: 303 });

  const [{ data: profile }, { data: track }] = await Promise.all([
    supabase.from('profiles').select('role, status').eq('id', user.id).maybeSingle(),
    supabase.from('tracks').select('owner_id, storage_path, cover_path').eq('id', id).maybeSingle(),
  ]);

  if (!track) return NextResponse.redirect(new URL('/my-tracks?delete=missing', request.url), { status: 303 });

  const isOwner = track.owner_id === user.id;
  const isAdmin = profile?.role === 'admin' && profile?.status === 'active';
  if (!isOwner && !isAdmin) return new NextResponse('Forbidden', { status: 403 });
  if (!isSupabaseAdminConfigured) return NextResponse.redirect(new URL('/my-tracks?delete=error', request.url), { status: 303 });

  const admin = createAdminSupabaseClient();

  /* Delete the database row first. A later storage failure leaves only an orphaned blob,
     never a public track that points at a missing file. */
  const { error: deleteError } = await admin.from('tracks').delete().eq('id', id);
  if (deleteError) return NextResponse.redirect(new URL('/my-tracks?delete=error', request.url), { status: 303 });

  if (track.storage_path) await admin.storage.from('audio').remove([track.storage_path]);
  if (track.cover_path) await admin.storage.from('covers').remove([track.cover_path]);

  return NextResponse.redirect(new URL('/my-tracks?deleted=1', request.url), { status: 303 });
}
