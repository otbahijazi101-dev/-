import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AudioCard } from '@/components/audio-card';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'مقطع صوتي أو فيديو' };

type Track = {
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

export default async function TrackPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createServerSupabaseClient();
  const [{ data: { user } }, { data }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from('tracks')
      .select('id, owner_id, slug, title, description, category, tags, cover_path, duration_seconds, waveform, storage_path, mime_type, published_at, owner:profiles!tracks_owner_id_fkey(username, display_name)')
      .eq('id', id).eq('status', 'published').maybeSingle(),
  ]);
  if (!data) notFound();
  const track = data as unknown as Track;
  const extension = track.storage_path.split('.').pop() || 'media';
  const safeTitle = track.title.replace(/[\\/:*?"<>|]+/g, '-').trim() || 'media';
  const [{ data: media }, { data: download }, cover] = await Promise.all([
    supabase.storage.from('audio').createSignedUrl(track.storage_path, 3600),
    supabase.storage.from('audio').createSignedUrl(track.storage_path, 3600, { download: `${safeTitle}.${extension}` }),
    track.cover_path ? supabase.storage.from('covers').createSignedUrl(track.cover_path, 3600) : Promise.resolve({ data: null }),
  ]);

  return (
    <section className="section track-detail-page">
      <div className="container">
        <div className="section-heading">
          <div><span className="section-kicker">استمع وشارك</span><h1>{track.title}</h1></div>
          <Link href="/">المكتبة</Link>
        </div>
        <div className="track-detail-card">
          <AudioCard
            id={track.id} ownerId={track.owner_id} userId={user?.id ?? null} slug={track.slug}
            title={track.title} description={track.description} category={track.category} tags={track.tags}
            username={track.owner?.username} displayName={track.owner?.display_name}
            mediaUrl={media?.signedUrl ?? null} downloadUrl={download?.signedUrl ?? null}
            coverUrl={cover.data?.signedUrl ?? null} mimeType={track.mime_type}
            publishedAt={track.published_at} durationSeconds={track.duration_seconds} waveform={track.waveform}
          />
        </div>
      </div>
    </section>
  );
}
