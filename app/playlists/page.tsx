import Link from 'next/link';
import { redirect } from 'next/navigation';
import { PlaylistCreator } from '@/components/playlist-creator';
import { PlaylistPlayButton } from '@/components/playlist-play-button';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { RadioItem } from '@/components/radio-player';

type PlaylistTrack = {
  id: string;
  title: string;
  mime_type: string | null;
  storage_path: string;
  cover_path: string | null;
  owner: { username: string; display_name: string | null } | null;
};

type PlaylistRow = {
  id: string;
  title: string;
  created_at: string;
  playlist_items: { sort_order: number; track: PlaylistTrack | null }[];
};

type ReadyPlaylist = PlaylistRow & {
  playItems: RadioItem[];
};

export default async function PlaylistsPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data } = await supabase
    .from('playlists')
    .select('id, title, created_at, playlist_items(sort_order, track:tracks(id, title, mime_type, storage_path, cover_path, owner:profiles!tracks_owner_id_fkey(username, display_name)))')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false });

  const rows = (data ?? []) as unknown as PlaylistRow[];
  const playlists: ReadyPlaylist[] = await Promise.all(rows.map(async (playlist) => {
    const ordered = [...(playlist.playlist_items ?? [])].sort((a, b) => a.sort_order - b.sort_order);
    const playItems = (await Promise.all(ordered.map(async (item) => {
      if (!item.track) return null;
      const [{ data: media }, cover] = await Promise.all([
        supabase.storage.from('audio').createSignedUrl(item.track.storage_path, 3600),
        item.track.cover_path
          ? supabase.storage.from('covers').createSignedUrl(item.track.cover_path, 3600)
          : Promise.resolve({ data: null }),
      ]);
      if (!media?.signedUrl) return null;
      return {
        id: item.track.id,
        title: item.track.title,
        creator: item.track.owner?.display_name || item.track.owner?.username || 'راديو',
        src: media.signedUrl,
        mimeType: item.track.mime_type,
        coverUrl: cover.data?.signedUrl ?? null,
        href: `/#track-${item.track.id}`,
      } satisfies RadioItem;
    }))).filter(Boolean) as RadioItem[];

    return { ...playlist, playlist_items: ordered, playItems };
  }));

  return (
    <section className="section">
      <div className="container">
        <div className="section-heading">
          <div><span className="section-kicker">مكتبتي</span><h2>قوائم التشغيل</h2></div>
          <PlaylistCreator userId={user.id} />
        </div>
        {playlists.length ? (
          <div className="playlist-grid">
            {playlists.map((playlist) => (
              <article className="playlist-card" key={playlist.id}>
                <div className="playlist-card-head">
                  <div><h3>{playlist.title}</h3><span>{playlist.playlist_items.length} مقطع</span></div>
                  <PlaylistPlayButton items={playlist.playItems} />
                </div>
                {playlist.playlist_items.length ? (
                  <ol>
                    {playlist.playlist_items.map((item) => item.track ? (
                      <li key={item.track.id}>
                        <Link href={`/#track-${item.track.id}`}>{item.track.title}</Link>
                        <small>{item.track.mime_type?.startsWith('video/') ? 'فيديو' : 'صوت'} · {item.track.owner?.display_name || item.track.owner?.username || 'راديو'}</small>
                      </li>
                    ) : null)}
                  </ol>
                ) : <p className="creator-name">هذه القائمة فارغة. أضف إليها من أي مقطع.</p>}
              </article>
            ))}
          </div>
        ) : <div className="empty-state"><strong>لم تنشئ قوائم تشغيل بعد.</strong><p>أنشئ قائمتك الأولى من الحقل أعلاه.</p></div>}
      </div>
    </section>
  );
}
