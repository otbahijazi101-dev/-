import Link from 'next/link';
import { redirect } from 'next/navigation';
import { PlaylistCreator } from '@/components/playlist-creator';
import { createServerSupabaseClient } from '@/lib/supabase/server';

type PlaylistRow = {
  id: string;
  title: string;
  created_at: string;
  playlist_items: { sort_order: number; track: { id: string; title: string; mime_type: string | null } | null }[];
};

export default async function PlaylistsPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data } = await supabase
    .from('playlists')
    .select('id, title, created_at, playlist_items(sort_order, track:tracks(id, title, mime_type))')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false });
  const playlists = (data ?? []) as unknown as PlaylistRow[];

  return (
    <section className="section">
      <div className="container">
        <div className="section-heading">
          <div><span className="section-kicker">مكتبتي</span><h2>قوائم التشغيل</h2></div>
          <PlaylistCreator userId={user.id} />
        </div>
        {playlists.length ? (
          <div className="playlist-grid">
            {playlists.map((playlist) => {
              const items = [...(playlist.playlist_items ?? [])].sort((a, b) => a.sort_order - b.sort_order);
              return (
                <article className="playlist-card" key={playlist.id}>
                  <div className="playlist-card-head"><h3>{playlist.title}</h3><span>{items.length} مقطع</span></div>
                  {items.length ? (
                    <ol>{items.map((item) => item.track ? <li key={item.track.id}><Link href={`/#track-${item.track.id}`}>{item.track.title}</Link><small>{item.track.mime_type?.startsWith('video/') ? 'فيديو' : 'صوت'}</small></li> : null)}</ol>
                  ) : <p className="creator-name">هذه القائمة فارغة. أضف إليها من أي مقطع.</p>}
                </article>
              );
            })}
          </div>
        ) : <div className="empty-state"><strong>لم تنشئ قوائم تشغيل بعد.</strong><p>أنشئ قائمتك الأولى من الحقل أعلاه.</p></div>}
      </div>
    </section>
  );
}
