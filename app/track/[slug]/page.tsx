import { notFound } from 'next/navigation';
import { AudioCard } from '@/components/audio-card';
import { createServerSupabaseClient } from '@/lib/supabase/server';

type TrackRow = {
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

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function TrackPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  let query = supabase
    .from('tracks')
    .select('id, owner_id, slug, title, description, category, tags, cover_path, duration_seconds, waveform, storage_path, mime_type, published_at, owner:profiles!tracks_owner_id_fkey(username, display_name)')
    .eq('status', 'published');

  query = uuidPattern.test(slug) ? query.eq('id', slug) : query.eq('slug', decodeURIComponent(slug));
  const { data } = await query.maybeSingle();
  const track = data as unknown as TrackRow | null;
  if (!track) notFound();

  const [{ data: media }, { data: download }, cover] = await Promise.all([
    supabase.storage.from('audio').createSignedUrl(track.storage_path, 60 * 60),
    supabase.storage.from('audio').createSignedUrl(track.storage_path, 60 * 60, { download: `${track.title}.${track.storage_path.split('.').pop() || 'media'}` }),
    track.cover_path ? supabase.storage.from('covers').createSignedUrl(track.cover_path, 60 * 60) : Promise.resolve({ data: null }),
  ]);

  return (
    <section className="section track-detail-section">
      <div className="container track-detail-container">
        <AudioCard
          id={track.id}
          ownerId={track.owner_id}
          userId={user?.id ?? null}
          slug={track.slug}
          title={track.title}
          description={track.description}
          category={track.category}
          tags={track.tags}
          username={track.owner?.username}
          displayName={track.owner?.display_name}
          mediaUrl={media?.signedUrl ?? null}
          downloadUrl={download?.signedUrl ?? null}
          coverUrl={cover.data?.signedUrl ?? null}
          mimeType={track.mime_type}
          publishedAt={track.published_at}
          durationSeconds={track.duration_seconds}
          waveform={track.waveform}
        />
      </div>
    </section>
  );
}
