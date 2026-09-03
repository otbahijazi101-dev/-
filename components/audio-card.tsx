type AudioCardProps = {
  title: string;
  description?: string | null;
  category?: string | null;
  username?: string | null;
  displayName?: string | null;
  audioUrl?: string | null;
  publishedAt?: string | null;
};

export function AudioCard({
  title,
  description,
  category,
  username,
  displayName,
  audioUrl,
  publishedAt,
}: AudioCardProps) {
  const dateLabel = publishedAt
    ? new Intl.DateTimeFormat('ar', { dateStyle: 'medium' }).format(new Date(publishedAt))
    : null;

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
          {dateLabel ? <span>{dateLabel}</span> : null}
        </div>
        <h2>{title}</h2>
        <p className="creator-name">
          {displayName || username || 'SoundPalestine'}
          {username ? <span className="creator-handle"> @{username}</span> : null}
        </p>
        {description ? <p className="audio-description">{description}</p> : null}
        {audioUrl ? (
          <audio className="audio-player" controls preload="none" src={audioUrl}>
            متصفحك لا يدعم تشغيل الصوت.
          </audio>
        ) : (
          <div className="audio-unavailable">الملف الصوتي غير متاح مؤقتًا.</div>
        )}
      </div>
    </article>
  );
}
