import type { Metadata } from 'next';
import Link from 'next/link';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { publicPlaylistSelect, publishedItems, type PublicPlaylist } from '@/lib/public-playlists';

export const metadata: Metadata = { title: 'قوائم المجتمع' };

export default async function CommunityPlaylistsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const raw = Number((await searchParams).page);
  const page = Number.isSafeInteger(raw) && raw > 0 ? Math.min(raw, 10000) : 1;
  const pageSize = 18;
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data, count } = await supabase.from('playlists')
    .select(publicPlaylistSelect, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);
  const playlists = (data ?? []) as unknown as PublicPlaylist[];
  const ready = playlists.map((playlist) => ({ playlist, items: publishedItems(playlist) }));

  return (
    <section className="section community-playlists-page">
      <div className="container">
        <div className="section-heading community-heading">
          <div><span className="section-kicker">اكتشف ما يجمعه الآخرون</span><h1>قوائم المجتمع</h1></div>
          <Link className="button button-ghost button-small" href={user ? '/playlists' : '/register'}>{user ? 'قوائمي' : 'أنشئ قائمة'}</Link>
        </div>
        {ready.length ? (
          <div className="playlist-grid community-playlist-grid">
            {ready.map(({ playlist, items }) => (
              <article className="playlist-card community-playlist-card" key={playlist.id}>
                <div className="playlist-card-art" aria-hidden="true"><span>{playlist.title.trim().slice(0, 1) || '♫'}</span></div>
                <div className="playlist-card-body">
                  <span className="section-kicker">قائمة تشغيل · {items.length} مقطع</span>
                  <h2><Link href={`/community-playlists/${playlist.id}`}>{playlist.title}</Link></h2>
                  {playlist.owner ? <Link className="playlist-owner" href={`/publisher/${encodeURIComponent(playlist.owner.username)}`}>بواسطة {playlist.owner.display_name || `@${playlist.owner.username}`}</Link> : null}
                  <p className="playlist-preview">{items.slice(0, 3).map(({ track }) => track.title).join(' · ') || 'قائمة بانتظار إضافة مقاطع منشورة.'}</p>
                  <div className="playlist-card-actions">
                    <Link className="button button-ghost button-small" href={`/community-playlists/${playlist.id}`}>عرض القائمة</Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : <div className="empty-state"><strong>{page > 1 ? 'لا توجد قوائم أخرى.' : 'لا توجد قوائم بعد.'}</strong><p>{page > 1 ? <Link href="/community-playlists">ارجع إلى القوائم الجديدة.</Link> : 'عندما ينشئ أحد قائمة تشغيل ستظهر هنا.'}</p></div>}
        {(count ?? 0) > pageSize ? (
          <nav className="feed-pagination" aria-label="صفحات قوائم التشغيل">
            {page > 1 ? <Link className="button button-ghost button-small" href={page === 2 ? '/community-playlists' : `/community-playlists?page=${page - 1}`}>الأحدث</Link> : null}
            <span>الصفحة {page} من {Math.ceil((count ?? 0) / pageSize)}</span>
            {page * pageSize < (count ?? 0) ? <Link className="button button-ghost button-small" href={`/community-playlists?page=${page + 1}`}>الأقدم</Link> : null}
          </nav>
        ) : null}
      </div>
    </section>
  );
}
