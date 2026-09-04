import { redirect } from 'next/navigation';
import { AudioCard } from '@/components/audio-card';
import { createServerSupabaseClient } from '@/lib/supabase/server';

type FeedTrack = {
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

export default async function FollowingPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: follows } = await supabase.from('follows').select('followed_id').eq('follower_id', user.id);
  const followedIds = (follows ?? []).map((row) => row.followed_id as string);

  if (!followedIds.length) {
    return (
      <section className="section"><div className="container"><div className="section-heading"><div><span className="section-kicker">متابعة</span><h2>أتابعهم</h2></div></div><div className="empty-state"><strong>أنت لا تتابع أحدًا بعد.</strong><p>اضغط «متابعة» بجانب أي ناشر في المكتبة لتظهر أحدث مشاركاته هنا.</p></div></div></section>
    );
  }

  const { data } = await supabase
    .from('tracks')
    .select('id, owner_id, slug, title, description, category, tags, cover_path, duration_seconds, waveform, storage_path, mime_type, published_at, owner:profiles!tracks_owner_id_fkey(username, display_name)')
    .eq('status', 'published')
    .in('owner_id', followedIds)
    .order('published_at', { ascending: false })
    .limit(60);
  const rows = (data ?? []) as unknown as FeedTrack[];

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
        <div className="section-heading"><div><span className="section-kicker">متابعة</span><h2>أتابعهم</h2></div><p>أحدث ما نُشر ممن اخترت متابعتهم.</p></div>
        {tracks.length ? <div className="audio-grid">{tracks.map((track) => <AudioCard key={track.id} id={track.id} ownerId={track.owner_id} userId={user.id} slug={track.slug} title={track.title} description={track.description} category={track.category} tags={track.tags} username={track.owner?.username} displayName={track.owner?.display_name} mediaUrl={track.mediaUrl} downloadUrl={track.downloadUrl} coverUrl={track.coverUrl} mimeType={track.mime_type} publishedAt={track.published_at} durationSeconds={track.duration_seconds} waveform={track.waveform} />)}</div> : <div className="empty-state"><strong>لا يوجد جديد حتى الآن.</strong><p>سيظهر هنا أحدث ما ينشره من تتابعهم.</p></div>}
      </div>
    </section>
  );
}
