import { VideoPreview } from '@/components/video-preview';

type AudioCardProps = {
  title: string;
  description?: string | null;
  category?: string | null;
  username?: string | null;
  displayName?: string | null;
  mediaUrl?: string | null;
  downloadUrl?: string | null;
  mimeType?: string | null;
  publishedAt?: string | null;
};

export function AudioCard({
  title,
  description,
  category,
  username,
  displayName,
  mediaUrl,
  downloadUrl,
  mimeType,
  publishedAt,
}: AudioCardProps) {
  const dateLabel = publishedAt
    ? new Intl.DateTimeFormat('ar', { dateStyle: 'medium' }).format(new Date(publishedAt))
    : null;
  const isVideo = Boolean(mimeType?.startsWith('video/'));

  return (
    <article
      className="audio-card"
      style={isVideo ? { gridColumn: '1 / -1', display: 'block' } : undefined}
    >
      {!isVideo ? (
        <div className="audio-cover" aria-hidden="true">
          <div className="waveform">
            {Array.from({ length: 16 }).map((_, index) => (
              <span key={index} style={{ height: `${18 + ((index * 17) % 54)}%` }} />
            ))}
          </div>
        </div>
      ) : null}

      <div className="audio-card-body" style={isVideo ? { padding: 0 } : undefined}>
        {isVideo && mediaUrl ? <VideoPreview src={mediaUrl} title={title} /> : null}

        <div style={isVideo ? { padding: '20px 24px 24px' } : undefined}>
          <div className="audio-card-meta">
            {category ? <span className="tag">{category}</span> : null}
            <span>{isVideo ? 'فيديو' : 'صوت'}</span>
            {dateLabel ? <span>{dateLabel}</span> : null}
          </div>
          <h2>{title}</h2>
          <p className="creator-name">
            {displayName || username || 'راديو'}
            {username ? <span className="creator-handle"> @{username}</span> : null}
          </p>
          {description ? <p className="audio-description">{description}</p> : null}

          {!isVideo && mediaUrl ? (
            <audio className="audio-player" controls preload="none" src={mediaUrl}>
              متصفحك لا يدعم تشغيل الصوت.
            </audio>
          ) : null}

          {mediaUrl && downloadUrl ? (
            <div style={{ marginTop: 14 }}>
              <a
                className="button button-ghost button-small"
                href={downloadUrl}
                download
              >
                {isVideo ? 'تحميل الفيديو' : 'تحميل الصوت'}
              </a>
            </div>
          ) : null}

          {!mediaUrl ? <div className="audio-unavailable">الملف غير متاح مؤقتًا.</div> : null}
        </div>
      </div>
    </article>
  );
}
