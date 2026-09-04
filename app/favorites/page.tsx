import { redirect } from 'next/navigation';
import { AudioCard } from '@/components/audio-card';
import { createServerSupabaseClient } from '@/lib/supabase/server';

type FavoriteRow = {
  track: {
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
  } | null;
};

export default async function FavoritesPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data } = await supabase
    .from('favorites')
    .select('track:tracks(id, owner_id, slug, title, description, category, tags, cover_path, duration_seconds, waveform, storage_path, mime_type, published_at, owner:profiles!tracks_owner_id_fkey(username, display_name))')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  const rows = ((data ?? []) as unknown as FavoriteRow[]).map((row) => row.track).filter(Boolean) as NonNullable<FavoriteRow['track']>[];
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
        <div className="section-heading"><div><span className="section-kicker">مكتبتي</span><h2>المحفوظات</h2></div><p>المحتوى الذي اخترت حفظه للعودة إليه لاحقًا.</p></div>
        {tracks.length ? <div className="audio-grid">{tracks.map((track) => <AudioCard key={track.id} id={track.id} ownerId={track.owner_id} userId={user.id} slug={track.slug} title={track.title} description={track.description} category={track.category} tags={track.tags} username={track.owner?.username} displayName={track.owner?.display_name} mediaUrl={track.mediaUrl} downloadUrl={track.downloadUrl} coverUrl={track.coverUrl} mimeType={track.mime_type} publishedAt={track.published_at} durationSeconds={track.duration_seconds} waveform={track.waveform} />)}</div> : <div className="empty-state"><strong>لا توجد محفوظات بعد.</strong><p>استخدم زر «حفظ» في أي مقطع.</p></div>}
      </div>
    </section>
  );
}
