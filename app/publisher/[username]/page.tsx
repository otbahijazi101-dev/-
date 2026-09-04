import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AudioCard } from '@/components/audio-card';
import { PlaylistPlayButton } from '@/components/playlist-play-button';
import type { RadioItem } from '@/components/radio-player';
import { createServerSupabaseClient } from '@/lib/supabase/server';

type ProfileRow = {
  id: string;
  username: string;
  display_name: string | null;
};

type TrackRow = {
  id: string;
  owner_id: string;
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
};

type ReadyTrack = TrackRow & {
  mediaUrl: string | null;
  downloadUrl: string | null;
  coverUrl: string | null;
};

type PlaylistTrack = {
  id: string;
  title: string;
  mime_type: string | null;
  storage_path: string;
  cover_path: string | null;
  owner: { username: string; display_name: string | null } | null;
};

type PlaylistRow = {
  id: string;
  title: string;
  created_at: string;
  playlist_items: { sort_order: number; track: PlaylistTrack | null }[];
};

type ReadyPlaylist = PlaylistRow & {
  items: { sort_order: number; track: PlaylistTrack }[];
  playItems: RadioItem[];
};

function downloadFileName(track: TrackRow) {
  const extension = track.storage_path.split('.').pop() || 'media';
  const safeTitle = track.title.replace(/[\\/:*?"<>|]+/g, '-').trim() || 'media';
  return `${safeTitle}.${extension}`;
}

export default async function PublisherPage({ params }: { params: Promise<{ username: string }> }) {
  const { username: rawUsername } = await params;
  const username = decodeURIComponent(rawUsername);
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profileData } = await supabase
    .from('profiles')
    .select('id, username, display_name')
    .eq('username', username)
    .maybeSingle();

  const profile = profileData as ProfileRow | null;
  if (!profile) notFound();

  const [{ data: trackData }, { data: playlistData }] = await Promise.all([
    supabase
      .from('tracks')
      .select('id, owner_id, title, description, category, tags, cover_path, duration_seconds, waveform, storage_path, mime_type, published_at')
      .eq('owner_id', profile.id)
      .eq('status', 'published')
      .order('published_at', { ascending: false }),
    supabase
      .from('playlists')
      .select('id, title, created_at, playlist_items(sort_order, track:tracks(id, title, mime_type, storage_path, cover_path, owner:profiles!tracks_owner_id_fkey(username, display_name)))')
      .eq('owner_id', profile.id)
      .order('created_at', { ascending: false }),
  ]);

  const trackRows = (trackData ?? []) as TrackRow[];
  const tracks: ReadyTrack[] = await Promise.all(trackRows.map(async (track) => {
    const [{ data: media }, { data: download }, cover] = await Promise.all([
      supabase.storage.from('audio').createSignedUrl(track.storage_path, 3600),
      supabase.storage.from('audio').createSignedUrl(track.storage_path, 3600, { download: downloadFileName(track) }),
      track.cover_path
        ? supabase.storage.from('covers').createSignedUrl(track.cover_path, 3600)
        : Promise.resolve({ data: null }),
    ]);

    return {
      ...track,
      mediaUrl: media?.signedUrl ?? null,
      downloadUrl: download?.signedUrl ?? null,
      coverUrl: cover.data?.signedUrl ?? null,
    };
  }));

  const playlistRows = (playlistData ?? []) as unknown as PlaylistRow[];
  const playlists: ReadyPlaylist[] = await Promise.all(playlistRows.map(async (playlist) => {
    const items = [...(playlist.playlist_items ?? [])]
      .filter((item): item is { sort_order: number; track: PlaylistTrack } => Boolean(item.track))
      .sort((a, b) => a.sort_order - b.sort_order);

    const playItems = (await Promise.all(items.map(async ({ track }) => {
      const [{ data: media }, cover] = await Promise.all([
        supabase.storage.from('audio').createSignedUrl(track.storage_path, 3600),
        track.cover_path
          ? supabase.storage.from('covers').createSignedUrl(track.cover_path, 3600)
          : Promise.resolve({ data: null }),
      ]);
      if (!media?.signedUrl) return null;
      return {
        id: track.id,
        title: track.title,
        creator: track.owner?.display_name || track.owner?.username || 'راديو',
        src: media.signedUrl,
        mimeType: track.mime_type,
        coverUrl: cover.data?.signedUrl ?? null,
        href: `/#track-${track.id}`,
      } satisfies RadioItem;
    }))).filter(Boolean) as RadioItem[];

    return { ...playlist, items, playItems };
  }));

  const creatorName = profile.display_name || profile.username;

  return (
    <section className="section publisher-page">
      <div className="container">
        <div className="publisher-heading">
          <div>
            <span className="section-kicker">الناشر</span>
            <h1>{creatorName}</h1>
            <p className="creator-handle">@{profile.username}</p>
          </div>
          <Link className="button button-ghost button-small" href="/">العودة للمكتبة</Link>
        </div>

        <div className="publisher-section">
          <div className="section-heading publisher-subheading">
            <div><span className="section-kicker">المحتوى</span><h2>منشورات {creatorName}</h2></div>
          </div>

          {tracks.length ? (
            <div className="audio-grid">
              {tracks.map((track) => (
                <AudioCard
                  key={track.id}
                  id={track.id}
                  ownerId={track.owner_id}
                  userId={user?.id ?? null}
                  title={track.title}
                  description={track.description}
                  category={track.category}
                  tags={track.tags}
                  username={profile.username}
                  displayName={profile.display_name}
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
          ) : (
            <div className="empty-state"><strong>لا توجد منشورات بعد.</strong></div>
          )}
        </div>

        <div className="publisher-section publisher-playlists-section">
          <div className="section-heading publisher-subheading">
            <div><span className="section-kicker">القوائم</span><h2>قوائم تشغيل {creatorName}</h2></div>
          </div>

          {playlists.length ? (
            <div className="playlist-grid">
              {playlists.map((playlist) => (
                <article className="playlist-card" key={playlist.id}>
                  <div className="playlist-card-head">
                    <div><h3>{playlist.title}</h3><span>{playlist.items.length} مقطع</span></div>
                    <PlaylistPlayButton items={playlist.playItems} />
                  </div>
                  {playlist.items.length ? (
                    <ol>
                      {playlist.items.map(({ track }) => (
                        <li key={track.id}>
                          <Link href={`/#track-${track.id}`}>{track.title}</Link>
                          <small>{track.mime_type?.startsWith('video/') ? 'فيديو' : 'صوت'} · {track.owner?.display_name || track.owner?.username || 'راديو'}</small>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p className="creator-name">لا تحتوي هذه القائمة على محتوى منشور حاليًا.</p>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state"><strong>لا توجد قوائم تشغيل لهذا الناشر بعد.</strong></div>
          )}
        </div>
      </div>
    </section>
  );
}
