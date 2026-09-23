import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PlaylistPlayButton } from '@/components/playlist-play-button';
import { PlaylistTrackButton } from '@/components/playlist-track-button';
import { SharePlaylistButton } from '@/components/share-playlist-button';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { playablePlaylist, publicPlaylistSelect, publishedItems, type PublicPlaylist } from '@/lib/public-playlists';

export const metadata: Metadata = { title: 'قائمة تشغيل' };

export default async function CommunityPlaylistPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.from('playlists')
    .select(publicPlaylistSelect).eq('id', id).maybeSingle();
  if (!data) notFound();
  const playlist = data as unknown as PublicPlaylist;
  const items = publishedItems(playlist);
  const playItems = await playablePlaylist(supabase, playlist);

  return (
    <section className="section community-playlists-page">
      <div className="container">
        <div className="playlist-detail-head">
          <div className="playlist-detail-art" aria-hidden="true">{playlist.title.trim().slice(0, 1) || '♫'}</div>
          <div>
            <span className="section-kicker">قائمة تشغيل عامة</span>
            <h1>{playlist.title}</h1>
            {playlist.owner ? <Link className="playlist-owner" href={`/publisher/${encodeURIComponent(playlist.owner.username)}`}>بواسطة {playlist.owner.display_name || `@${playlist.owner.username}`}</Link> : null}
            <p>{items.length} مقطع منشور</p>
            <div className="playlist-card-actions"><PlaylistPlayButton items={playItems} /><SharePlaylistButton id={playlist.id} title={playlist.title} /></div>
          </div>
        </div>
        <div className="section-heading"><div><span className="section-kicker">المحتوى</span><h2>المقاطع بالترتيب</h2></div><Link href="/community-playlists">كل القوائم</Link></div>
        {items.length ? (
          <ol className="playlist-detail-list">
            {items.map(({ track }, index) => (
              <li key={track.id}>
                <span className="playlist-track-number">{String(index + 1).padStart(2, '0')}</span>
                <div><strong>{track.title}</strong><small>{track.owner?.display_name || track.owner?.username || 'راديو'}</small></div>
                <span className="playlist-track-type">{track.mime_type?.startsWith('video/') ? 'فيديو' : 'صوت'}</span>
                <PlaylistTrackButton items={playItems} index={playItems.findIndex((item) => item.id === track.id)} />
              </li>
            ))}
          </ol>
        ) : <div className="empty-state"><strong>لا توجد مقاطع منشورة في هذه القائمة حاليًا.</strong></div>}
      </div>
    </section>
  );
}
