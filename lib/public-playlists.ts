import 'server-only';

import type { RadioItem } from '@/components/radio-player';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export type PublicPlaylistTrack = {
  id: string;
  title: string;
  status: string;
  mime_type: string | null;
  storage_path: string;
  cover_path: string | null;
  owner: { username: string; display_name: string | null } | null;
};

export type PublicPlaylist = {
  id: string;
  title: string;
  created_at: string;
  owner: { username: string; display_name: string | null } | null;
  playlist_items: { sort_order: number; track: PublicPlaylistTrack | null }[];
};

export const publicPlaylistSelect = 'id, title, created_at, owner:profiles!playlists_owner_id_fkey(username, display_name), playlist_items(sort_order, track:tracks(id, title, status, mime_type, storage_path, cover_path, owner:profiles!tracks_owner_id_fkey(username, display_name)))';

export function publishedItems(playlist: PublicPlaylist) {
  return [...(playlist.playlist_items ?? [])]
    .filter((item): item is { sort_order: number; track: PublicPlaylistTrack } => item.track?.status === 'published')
    .sort((a, b) => a.sort_order - b.sort_order);
}

export async function playablePlaylist(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  playlist: PublicPlaylist,
): Promise<RadioItem[]> {
  return (await Promise.all(publishedItems(playlist).map(async ({ track }): Promise<RadioItem | null> => {
    const [{ data: media }, cover] = await Promise.all([
      supabase.storage.from('audio').createSignedUrl(track.storage_path, 3600),
      track.cover_path ? supabase.storage.from('covers').createSignedUrl(track.cover_path, 3600) : Promise.resolve({ data: null }),
    ]);
    if (!media?.signedUrl) return null;
    return {
      id: track.id,
      title: track.title,
      creator: track.owner?.display_name || track.owner?.username || 'راديو',
      src: media.signedUrl,
      mimeType: track.mime_type,
      coverUrl: cover.data?.signedUrl ?? null,
      href: `/track/${track.id}`,
    } satisfies RadioItem;
  }))).filter((item): item is RadioItem => item !== null);
}
