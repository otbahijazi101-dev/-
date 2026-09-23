import Link from 'next/link';
import Image from 'next/image';
import { AudioCard } from '@/components/audio-card';
import { getSiteLogoUrl, getSiteName } from '@/lib/site-settings';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { createServerSupabaseClient } from '@/lib/supabase/server';

type PublicTrackRow = {
  id: string;
  owner_id: string;
  slug: string | null;
  title: string;
  description: string | null;
  category: string | null;
  tags: string[] | null;
  cover_path: string | null;
  duration_seconds: number | null;
  waveform: number[] | null;
  storage_path: string;
  mime_type: string | null;
  published_at: string | null;
  owner: { username: string; display_name: string | null } | null;
};

type PublicTrack = PublicTrackRow & { mediaUrl: string | null; downloadUrl: string | null; coverUrl: string | null };
type FeaturedPlaylist = { id: string; title: string; owner: { username: string; display_name: string | null } | null; playlist_items: { track: { status: string } | null }[] };

function downloadFileName(track: PublicTrackRow) {
  const extension = track.storage_path.split('.').pop() || 'media';
  const safeTitle = track.title.replace(/[\\/:*?"<>|]+/g, '-').trim() || 'media';
  return `${safeTitle}.${extension}`;
}

export default async function HomePage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { page: rawPage } = await searchParams;
  const parsedPage = Number(rawPage);
  const page = Number.isSafeInteger(parsedPage) && parsedPage > 0 ? Math.min(parsedPage, 10000) : 1;
  const pageSize = 30;
  const [siteName, logoUrl] = await Promise.all([getSiteName(), getSiteLogoUrl()]);
  const siteMonogram = siteName.trim().slice(0, 2) || 'ر';
  let tracks: PublicTrack[] = [];
  let uploadHref = '/register';
  let userId: string | null = null;
  let totalTracks = 0;
  let featuredPlaylists: FeaturedPlaylist[] = [];

  if (isSupabaseConfigured) {
    try {
      const supabase = await createServerSupabaseClient();
      const [authResult, playlistResult, trackResult] = await Promise.all([
        supabase.auth.getUser(),
        supabase.from('playlists')
          .select('id, title, owner:profiles!playlists_owner_id_fkey(username, display_name), playlist_items(track:tracks(status))')
          .order('created_at', { ascending: false }).limit(3),
        supabase.from('tracks')
          .select('id, owner_id, slug, title, description, category, tags, cover_path, duration_seconds, waveform, storage_path, mime_type, published_at, owner:profiles!tracks_owner_id_fkey(username, display_name)', { count: 'exact' })
          .eq('status', 'published')
          .order('published_at', { ascending: false })
          .range((page - 1) * pageSize, page * pageSize - 1),
      ]);
      const { user } = authResult.data;
      userId = user?.id ?? null;
      uploadHref = user ? '/upload' : '/register';

      featuredPlaylists = (playlistResult.data ?? []) as unknown as FeaturedPlaylist[];
      totalTracks = trackResult.count ?? 0;
      const rows = (trackResult.data ?? []) as unknown as PublicTrackRow[];
      const [mediaResults, coverResults] = await Promise.all([
        rows.length ? supabase.storage.from('audio').createSignedUrls(rows.map((track) => track.storage_path), 3600) : Promise.resolve({ data: null }),
        rows.some((track) => track.cover_path)
          ? supabase.storage.from('covers').createSignedUrls(rows.filter((track) => track.cover_path).map((track) => track.cover_path!), 3600)
          : Promise.resolve({ data: null }),
      ]);
      const mediaByPath = new Map(mediaResults.data?.map((signed) => [signed.path, signed.signedUrl]) ?? []);
      const coverByPath = new Map(coverResults.data?.map((signed) => [signed.path, signed.signedUrl]) ?? []);
      tracks = await Promise.all(rows.map(async (track) => {
        const { data: downloadSigned } = await supabase.storage.from('audio').createSignedUrl(track.storage_path, 3600, { download: downloadFileName(track) });
        return {
          ...track,
          mediaUrl: mediaByPath.get(track.storage_path) ?? null,
          downloadUrl: downloadSigned?.signedUrl ?? null,
          coverUrl: track.cover_path ? coverByPath.get(track.cover_path) ?? null : null,
        };
      }));
    } catch {
      tracks = [];
    }
  }

  return (
    <>
      <section className="hero hero-refined">
        <div className="container hero-grid">
          <div className="hero-copy">
            <span className="eyebrow">{siteName}</span>
            <h1>كل صوت يستحق أن يُسمع.</h1>
            <p>استمع إلى ما يشاركه أصدقاؤك، واكتشف قوائمهم في مكان واحد.</p>
            <div className="hero-actions">
              <a className="button button-light" href="#latest">استمع الآن</a>
              <Link className="button button-outline-light" href={uploadHref}>ارفع محتوى</Link>
            </div>
            <form className="hero-search" action="/search">
              <input name="q" placeholder="ابحث عن مقطع أو شخص" aria-label="البحث" />
              <button type="submit">بحث</button>
            </form>
          </div>

          <div className="hero-art" aria-hidden="true">
            <div className="hero-disc"><div className="hero-disc-center">{logoUrl ? <Image className="hero-brand-logo" src={logoUrl} alt="" width={90} height={90} unoptimized /> : siteMonogram}</div></div>
            <div className="hero-wave">{Array.from({ length: 20 }).map((_, index) => <span key={index} style={{ height: `${18 + ((index * 31) % 72)}%` }} />)}</div>
          </div>
        </div>
      </section>

      {featuredPlaylists.length ? (
        <section className="section home-playlist-section">
          <div className="container">
            <div className="section-heading">
              <div><span className="section-kicker">من المجتمع</span><h2>قوائم جمعها المستمعون</h2></div>
              <Link href="/community-playlists">تصفح كل القوائم</Link>
            </div>
            <div className="home-playlist-grid">
              {featuredPlaylists.map((playlist) => (
                <Link className="home-playlist-tile" href={`/community-playlists/${playlist.id}`} key={playlist.id}>
                  <span className="home-playlist-art" aria-hidden="true">{playlist.title.trim().slice(0, 1) || '♫'}</span>
                  <strong>{playlist.title}</strong>
                  <small>{playlist.owner?.display_name || playlist.owner?.username || 'أحد المستمعين'} · {playlist.playlist_items?.filter((item) => item.track?.status === 'published').length ?? 0} مقطع</small>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="section latest-section" id="latest">
        <div className="container">
          <div className="section-heading latest-heading">
            <div>
              <span className="section-kicker">المكتبة العامة</span>
              <h2>{page === 1 ? 'أحدث المحتوى' : 'محتوى أقدم'}</h2>
            </div>
            <p>اضغط على المقطع لتشغيله، أو احفظه لقائمتك.</p>
          </div>

          {!isSupabaseConfigured ? (
            <div className="empty-state"><strong>الواجهة جاهزة.</strong><p>سيظهر المحتوى هنا فور ربط مشروع Supabase الخاص بـ {siteName}.</p></div>
          ) : tracks.length === 0 ? (
            <div className="empty-state"><strong>{page > 1 ? 'لا توجد ملفات أخرى.' : 'لا توجد ملفات منشورة بعد.'}</strong><p>{page > 1 ? <Link href="/#latest">ارجع إلى أحدث الملفات.</Link> : 'عند نشر أول ملف صوتي أو فيديو سيظهر هنا مباشرة.'}</p></div>
          ) : (
            <>
              <div className="audio-grid feed-grid">
                {tracks.map((track) => (
                  <AudioCard
                    key={track.id}
                    id={track.id}
                    ownerId={track.owner_id}
                    userId={userId}
                    slug={track.slug}
                    title={track.title}
                    description={track.description}
                    category={track.category}
                    tags={track.tags}
                    username={track.owner?.username}
                    displayName={track.owner?.display_name}
                    mediaUrl={track.mediaUrl}
                    downloadUrl={track.downloadUrl}
                    coverUrl={track.coverUrl}
                    mimeType={track.mime_type}
                    publishedAt={track.published_at}
                    durationSeconds={track.duration_seconds}
                    waveform={track.waveform}
                  />
                ))}
              </div>
              {totalTracks > pageSize ? (
                <nav className="feed-pagination" aria-label="صفحات المكتبة">
                  {page > 1 ? <Link className="button button-ghost button-small" href={page === 2 ? '/#latest' : `/?page=${page - 1}#latest`}>الأحدث</Link> : null}
                  <span>الصفحة {page} من {Math.ceil(totalTracks / pageSize)}</span>
                  {page * pageSize < totalTracks ? <Link className="button button-ghost button-small" href={`/?page=${page + 1}#latest`}>الأقدم</Link> : null}
                </nav>
              ) : null}
            </>
          )}
        </div>
      </section>
    </>
  );
}
