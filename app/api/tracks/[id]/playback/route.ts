import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

type PlaybackOwner = { username: string; display_name: string | null };

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();

  const { data: track, error } = await supabase
    .from('tracks')
    .select('id, title, mime_type, storage_path, cover_path, owner:profiles!tracks_owner_id_fkey(username, display_name)')
    .eq('id', id)
    .eq('status', 'published')
    .maybeSingle();

  if (error || !track) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const rawOwner = track.owner as unknown;
  const owner: PlaybackOwner | null = Array.isArray(rawOwner)
    ? ((rawOwner[0] as PlaybackOwner | undefined) ?? null)
    : ((rawOwner as PlaybackOwner | null) ?? null);

  const [{ data: media }, cover] = await Promise.all([
    supabase.storage.from('audio').createSignedUrl(track.storage_path, 3600),
    track.cover_path
      ? supabase.storage.from('covers').createSignedUrl(track.cover_path, 3600)
      : Promise.resolve({ data: null }),
  ]);

  if (!media?.signedUrl) return NextResponse.json({ error: 'unavailable' }, { status: 503 });

  return NextResponse.json({
    item: {
      id: track.id,
      title: track.title,
      creator: owner?.display_name || owner?.username || 'راديو',
      src: media.signedUrl,
      mimeType: track.mime_type,
      coverUrl: cover.data?.signedUrl ?? null,
      href: `/#track-${track.id}`,
    },
  });
}
