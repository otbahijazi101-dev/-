import Link from 'next/link';
import { VideoPreview } from '@/components/video-preview';
import { TrackWaveform } from '@/components/track-waveform';
import { TrackActions } from '@/components/track-actions';

export type AudioCardProps = {
  id: string;
  ownerId?: string | null;
  userId?: string | null;
  slug?: string | null;
  title: string;
  description?: string | null;
  category?: string | null;
  tags?: string[] | null;
  username?: string | null;
  displayName?: string | null;
  mediaUrl?: string | null;
  downloadUrl?: string | null;
  coverUrl?: string | null;
  mimeType?: string | null;
  publishedAt?: string | null;
  durationSeconds?: number | null;
  waveform?: number[] | null;
};

function normalizeName(value?: string | null) {
  return value?.trim().toLocaleLowerCase('en-US') ?? '';
}

function formatDuration(value?: number | null) {
  if (!value || !Number.isFinite(value) || value <= 0) return null;
  const total = Math.round(value);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function AudioCard({
  id,
  ownerId,
  userId,
  title,
  description,
  category,
  tags,
  username,
  displayName,
  mediaUrl,
  downloadUrl,
  coverUrl,
  mimeType,
  publishedAt,
  durationSeconds,
  waveform,
}: AudioCardProps) {
  const dateLabel = publishedAt
    ? new Intl.DateTimeFormat('ar', { dateStyle: 'medium' }).format(new Date(publishedAt))
    : null;
  const durationLabel = formatDuration(durationSeconds);
  const isVideo = Boolean(mimeType?.startsWith('video/'));
  const href = `/#track-${id}`;
  const hasDistinctDisplayName = Boolean(
    displayName && username && normalizeName(displayName) !== normalizeName(username),
  );
  const creator = hasDistinctDisplayName ? displayName! : username || displayName || 'راديو';
  const creatorLabel = username
    ? hasDistinctDisplayName
      ? `${displayName} — @${username}`
      : `@${username}`
    : creator;
  const item = mediaUrl ? {
    id,
    title,
    creator,
    src: mediaUrl,
    mimeType,
    coverUrl,
    href,
  } : null;

  return (
    <article id={`track-${id}`} className="audio-card media-list-card">
      <div className="media-list-thumb">
        {isVideo && mediaUrl ? (
          <VideoPreview src={mediaUrl} title={title} poster={coverUrl} variant="compact" />
        ) : (
          <div
            className="media-thumb"
            style={coverUrl ? { backgroundImage: `url(${coverUrl})` } : undefined}
            aria-label={title}
          >
            {!coverUrl ? (
              <div className="media-thumb-wave" aria-hidden="true">
                {Array.from({ length: 9 }).map((_, index) => (
                  <span key={index} style={{ height: `${24 + ((index * 19) % 66)}%` }} />
                ))}
              </div>
            ) : null}
          </div>
        )}
      </div>

      <div className="media-list-copy">
        <div className="media-list-title-row">
          <h2>{title}</h2>
          {item ? (
            <TrackActions
              item={item}
              userId={userId}
              ownerId={ownerId}
              compact
              downloadUrl={downloadUrl}
              downloadLabel={isVideo ? 'تحميل الفيديو' : 'تحميل الصوت'}
            />
          ) : null}
        </div>

        <p className="creator-name">
          {username ? (
            <Link className="creator-link" href={`/publisher/${encodeURIComponent(username)}`}>
              {creatorLabel}
            </Link>
          ) : creatorLabel}
        </p>

        <div className="media-list-meta">
          <span>{isVideo ? 'فيديو' : 'صوت'}</span>
          {durationLabel ? <span>{durationLabel}</span> : null}
          {category ? <span>{category}</span> : null}
          {dateLabel ? <span>{dateLabel}</span> : null}
        </div>

        {description ? <p className="media-list-description">{description}</p> : null}
        {tags?.length ? <div className="track-tags">{tags.map((tag) => <Link href={`/search?q=${encodeURIComponent(tag)}`} key={tag}>#{tag}</Link>)}</div> : null}
        {!isVideo && item ? <TrackWaveform item={item} waveform={waveform} durationSeconds={durationSeconds} /> : null}
        {!mediaUrl ? <div className="audio-unavailable">الملف غير متاح مؤقتًا.</div> : null}
      </div>
    </article>
  );
}
