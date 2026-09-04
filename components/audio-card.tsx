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
  const isVideo = Boolean(mimeType?.startsWith('video/'));
  const href = `/#track-${id}`;
  const creator = displayName || username || 'راديو';
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
    <article id={`track-${id}`} className={`audio-card ${isVideo ? 'audio-card-video' : ''}`}>
      {!isVideo ? (
        coverUrl ? (
          <div className="audio-cover audio-cover-image" style={{ backgroundImage: `url(${coverUrl})` }} aria-label={title} />
        ) : (
          <div className="audio-cover" aria-hidden="true">
            <div className="waveform">
              {Array.from({ length: 16 }).map((_, index) => <span key={index} style={{ height: `${18 + ((index * 17) % 54)}%` }} />)}
            </div>
          </div>
        )
      ) : null}

      <div className={`audio-card-body ${isVideo ? 'audio-card-body-video' : ''}`}>
        {isVideo && mediaUrl ? <VideoPreview src={mediaUrl} title={title} poster={coverUrl} /> : null}

        <div className={isVideo ? 'video-card-copy' : undefined}>
          <div className="audio-card-meta">
            {category ? <span className="tag">{category}</span> : null}
            <span>{isVideo ? 'فيديو' : 'صوت'}</span>
            {dateLabel ? <span>{dateLabel}</span> : null}
          </div>
          <h2>{title}</h2>
          <p className="creator-name">{creator}{username ? <span className="creator-handle"> @{username}</span> : null}</p>
          {description ? <p className="audio-description">{description}</p> : null}
          {tags?.length ? <div className="track-tags">{tags.map((tag) => <Link href={`/search?q=${encodeURIComponent(tag)}`} key={tag}>#{tag}</Link>)}</div> : null}

          {!isVideo && item ? <TrackWaveform item={item} waveform={waveform} durationSeconds={durationSeconds} /> : null}
          {item ? <TrackActions item={item} userId={userId} ownerId={ownerId} /> : null}

          {mediaUrl && downloadUrl ? (
            <div className="download-row"><a className="button button-ghost button-small" href={downloadUrl} download>{isVideo ? 'تحميل الفيديو' : 'تحميل الصوت'}</a></div>
          ) : null}
          {!mediaUrl ? <div className="audio-unavailable">الملف غير متاح مؤقتًا.</div> : null}
        </div>
      </div>
    </article>
  );
}
