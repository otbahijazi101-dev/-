import { NextResponse } from 'next/server';
import { createAdminSupabaseClient, isSupabaseAdminConfigured } from '@/lib/supabase/admin';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isSupabaseAdminConfigured) return new NextResponse('Forbidden', { status: 403 });
  const body = await request.json().catch(() => null);
  if (!body || typeof body.trackId !== 'string') return new NextResponse('Bad Request', { status: 400 });

  const admin = createAdminSupabaseClient();
  const { data: track } = await admin.from('tracks')
    .select('owner_id, storage_path, cover_path').eq('id', body.trackId).maybeSingle();
  if (!track || track.owner_id !== user.id) return new NextResponse('Forbidden', { status: 403 });

  for (const [bucket, oldPath, currentPath, column] of [
    ['audio', body.audioPath, track.storage_path, 'storage_path'],
    ['covers', body.coverPath, track.cover_path, 'cover_path'],
  ] as const) {
    if (typeof oldPath !== 'string' || oldPath.length > 300 || !oldPath.startsWith(`${user.id}/`) || oldPath === currentPath) continue;
    const { count, error } = await admin.from('tracks')
      .select('id', { count: 'exact', head: true }).eq(column, oldPath);
    if (!error && count === 0) await admin.storage.from(bucket).remove([oldPath]);
  }
  return NextResponse.json({ ok: true });
}
