'use client';

import { useState } from 'react';

export function VideoPreview({ src, title, poster }: { src: string; title: string; poster?: string | null }) {
  const [playing, setPlaying] = useState(false);

  if (playing) {
    return (
      <div className="video-player-expanded">
        <video controls autoPlay playsInline preload="metadata" src={src} poster={poster || undefined}>
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
      style={poster ? { backgroundImage: `linear-gradient(rgba(0,0,0,.15), rgba(0,0,0,.28)), url(${poster})` } : undefined}
    >
      <span className="video-preview-label">مشاهدة الفيديو</span>
    </button>
  );
}
