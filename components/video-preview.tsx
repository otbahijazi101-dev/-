'use client';

import { useState } from 'react';

export function VideoPreview({ src, title, poster }: { src: string; title: string; poster?: string | null }) {
  const [playing, setPlaying] = useState(false);

  if (playing) {
    return (
      <div style={{ width: '100%', aspectRatio: '16 / 9', background: '#000', overflow: 'hidden' }}>
        <video controls autoPlay playsInline preload="metadata" src={src} poster={poster || undefined} style={{ width: '100%', height: '100%', display: 'block', objectFit: 'contain', background: '#000' }}>
          متصفحك لا يدعم تشغيل الفيديو.
        </video>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setPlaying(true)}
      aria-label={`تشغيل الفيديو: ${title}`}
      className="video-preview-banner"
      style={poster ? { backgroundImage: `linear-gradient(rgba(0,0,0,.16), rgba(0,0,0,.32)), url(${poster})` } : undefined}
    >
      <span className="video-preview-play" aria-hidden="true">▶</span>
      <span className="video-preview-label">اضغط للمشاهدة</span>
    </button>
  );
}
