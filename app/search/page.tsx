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

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = '' } = await searchParams;
  const term = q.trim().toLocaleLowerCase('ar');
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data } = await supabase
    .from('tracks')
    .select('id, owner_id, slug, title, description, category, tags, cover_path, duration_seconds, waveform, storage_path, mime_type, published_at, owner:profiles!tracks_owner_id_fkey(username, display_name)')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(100);

  const rows = ((data ?? []) as unknown as SearchTrack[]).filter((track) => {
    if (!term) return true;
    const haystack = [track.title, track.description, track.category, track.owner?.username, track.owner?.display_name, ...(track.tags ?? [])]
      .filter(Boolean).join(' ').toLocaleLowerCase('ar');
    return haystack.includes(term);
  });

  const tracks = await Promise.all(rows.map(async (track) => {
    const [{ data: media }, { data: download }, cover] = await Promise.all([
      supabase.storage.from('audio').createSignedUrl(track.storage_path, 3600),
      supabase.storage.from('audio').createSignedUrl(track.storage_path, 3600, { download: `${track.title}.${track.storage_path.split('.').pop() || 'media'}` }),
      track.cover_path ? supabase.storage.from('covers').createSignedUrl(track.cover_path, 3600) : Promise.resolve({ data: null }),
    ]);
    return { ...track, mediaUrl: media?.signedUrl ?? null, downloadUrl: download?.signedUrl ?? null, coverUrl: cover.data?.signedUrl ?? null };
  }));

  return (
    <section className="section">
      <div className="container">
        <div className="section-heading">
          <div><span className="section-kicker">البحث</span><h2>{term ? `نتائج: ${q}` : 'اكتشف المحتوى'}</h2></div>
          <form className="search-page-form" action="/search"><input name="q" defaultValue={q} placeholder="عنوان، ناشر، تصنيف أو وسم" /><button className="button button-dark button-small" type="submit">بحث</button></form>
        </div>
        {tracks.length ? (
          <div className="audio-grid">{tracks.map((track) => <AudioCard key={track.id} id={track.id} ownerId={track.owner_id} userId={user?.id ?? null} slug={track.slug} title={track.title} description={track.description} category={track.category} tags={track.tags} username={track.owner?.username} displayName={track.owner?.display_name} mediaUrl={track.mediaUrl} downloadUrl={track.downloadUrl} coverUrl={track.coverUrl} mimeType={track.mime_type} publishedAt={track.published_at} durationSeconds={track.duration_seconds} waveform={track.waveform} />)}</div>
        ) : <div className="empty-state"><strong>لا توجد نتائج.</strong><p>جرّب كلمة بحث أخرى أو <Link href="/">ارجع للمكتبة.</Link></p></div>}
      </div>
    </section>
  );
}
