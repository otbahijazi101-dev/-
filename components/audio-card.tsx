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
    <article className="audio-card">
      <div className="audio-cover" aria-hidden="true">
        <div className="waveform">
          {Array.from({ length: 16 }).map((_, index) => (
            <span key={index} style={{ height: `${18 + ((index * 17) % 54)}%` }} />
          ))}
        </div>
      </div>
      <div className="audio-card-body">
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
        {mediaUrl ? (
          isVideo ? (
            <video
              controls
              preload="metadata"
              src={mediaUrl}
              style={{ width: '100%', maxHeight: 360, borderRadius: 12, background: '#000', marginTop: 'auto' }}
            >
              متصفحك لا يدعم تشغيل الفيديو.
            </video>
          ) : (
            <>
              <audio className="audio-player" controls preload="none" src={mediaUrl}>
                متصفحك لا يدعم تشغيل الصوت.
              </audio>
              <div style={{ marginTop: 12 }}>
                <a className="button button-ghost button-small" href={downloadUrl || mediaUrl} download>
                  تنزيل الصوت
                </a>
              </div>
            </>
          )
        ) : (
          <div className="audio-unavailable">الملف غير متاح مؤقتًا.</div>
        )}
      </div>
    </article>
  );
}
