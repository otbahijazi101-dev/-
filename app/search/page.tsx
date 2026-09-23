import Link from 'next/link';
import { AudioCard } from '@/components/audio-card';
import { createServerSupabaseClient } from '@/lib/supabase/server';

type SearchTrack = {
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

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const { q: rawQuery = '', page: rawPage } = await searchParams;
  const q = rawQuery.slice(0, 120);
  const term = q.trim().toLocaleLowerCase('ar');
  const parsedPage = Number(rawPage);
  const page = Number.isSafeInteger(parsedPage) && parsedPage > 0 ? Math.min(parsedPage, 10000) : 1;
  const supabase = await createServerSupabaseClient();
  const authPromise = supabase.auth.getUser();
  const allRows: SearchTrack[] = [];
  const batchSize = 500;
  const pageSize = 30;
  let totalMatches = 0;
  let rows: SearchTrack[] = [];
  if (!term) {
    const { data, count } = await supabase.from('tracks')
      .select('id, owner_id, slug, title, description, category, tags, cover_path, duration_seconds, waveform, storage_path, mime_type, published_at, owner:profiles!tracks_owner_id_fkey(username, display_name)', { count: 'exact' })
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);
    rows = (data ?? []) as unknown as SearchTrack[];
    totalMatches = count ?? 0;
  } else for (let offset = 0; ; offset += batchSize) {
    const { data, error } = await supabase
      .from('tracks')
      .select('id, owner_id, slug, title, description, category, tags, cover_path, duration_seconds, waveform, storage_path, mime_type, published_at, owner:profiles!tracks_owner_id_fkey(username, display_name)')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .range(offset, offset + batchSize - 1);
    if (error) break;
    allRows.push(...((data ?? []) as unknown as SearchTrack[]));
    if (!data || data.length < batchSize) break;
  }

  const matches = allRows.filter((track) => {
    const haystack = [track.title, track.description, track.category, track.owner?.username, track.owner?.display_name, ...(track.tags ?? [])]
      .filter(Boolean).join(' ').toLocaleLowerCase('ar');
    return haystack.includes(term);
  });
  if (term) {
    totalMatches = matches.length;
    rows = matches.slice((page - 1) * pageSize, page * pageSize);
  }
  const { data: { user } } = await authPromise;
  const firstPage = term ? `/search?q=${encodeURIComponent(q)}` : '/search';
  const pageUrl = (number: number) => `${firstPage}${term ? '&' : '?'}page=${number}`;

  const [mediaResults, coverResults] = await Promise.all([
    rows.length ? supabase.storage.from('audio').createSignedUrls(rows.map((track) => track.storage_path), 3600) : Promise.resolve({ data: null }),
    rows.some((track) => track.cover_path)
      ? supabase.storage.from('covers').createSignedUrls(rows.filter((track) => track.cover_path).map((track) => track.cover_path!), 3600)
      : Promise.resolve({ data: null }),
  ]);
  const mediaByPath = new Map(mediaResults.data?.map((signed) => [signed.path, signed.signedUrl]) ?? []);
  const coverByPath = new Map(coverResults.data?.map((signed) => [signed.path, signed.signedUrl]) ?? []);
  const tracks = await Promise.all(rows.map(async (track) => {
    const { data: download } = await supabase.storage.from('audio').createSignedUrl(track.storage_path, 3600, { download: `${track.title}.${track.storage_path.split('.').pop() || 'media'}` });
    return { ...track, mediaUrl: mediaByPath.get(track.storage_path) ?? null, downloadUrl: download?.signedUrl ?? null, coverUrl: track.cover_path ? coverByPath.get(track.cover_path) ?? null : null };
  }));

  return (
    <section className="section">
      <div className="container">
        <div className="section-heading">
          <div><span className="section-kicker">البحث</span><h2>{term ? `نتائج: ${q}` : 'اكتشف المحتوى'}</h2></div>
          <form className="search-page-form" action="/search"><input name="q" defaultValue={q} maxLength={120} placeholder="عنوان، ناشر، تصنيف أو وسم" /><button className="button button-dark button-small" type="submit">بحث</button></form>
        </div>
        {tracks.length ? (
          <>
            <div className="audio-grid">{tracks.map((track) => <AudioCard key={track.id} id={track.id} ownerId={track.owner_id} userId={user?.id ?? null} slug={track.slug} title={track.title} description={track.description} category={track.category} tags={track.tags} username={track.owner?.username} displayName={track.owner?.display_name} mediaUrl={track.mediaUrl} downloadUrl={track.downloadUrl} coverUrl={track.coverUrl} mimeType={track.mime_type} publishedAt={track.published_at} durationSeconds={track.duration_seconds} waveform={track.waveform} />)}</div>
            {totalMatches > pageSize ? (
              <nav className="feed-pagination" aria-label="صفحات البحث">
                {page > 1 ? <Link className="button button-ghost button-small" href={page === 2 ? firstPage : pageUrl(page - 1)}>الأحدث</Link> : null}
                <span>الصفحة {page} من {Math.ceil(totalMatches / pageSize)}</span>
                {page * pageSize < totalMatches ? <Link className="button button-ghost button-small" href={pageUrl(page + 1)}>الأقدم</Link> : null}
              </nav>
            ) : null}
          </>
        ) : <div className="empty-state"><strong>{page > 1 && totalMatches ? 'لا توجد نتائج أخرى.' : 'لا توجد نتائج.'}</strong><p>{page > 1 && totalMatches ? <Link href={firstPage}>ارجع إلى أول النتائج.</Link> : <>جرّب كلمة بحث أخرى أو <Link href="/">ارجع للمكتبة.</Link></>}</p></div>}
      </div>
    </section>
  );
}
