'use client';

import { useState } from 'react';

export function VideoPreview({
  src,
  title,
  poster,
  variant = 'banner',
}: {
  src: string;
  title: string;
  poster?: string | null;
  variant?: 'banner' | 'compact';
}) {
  const [playing, setPlaying] = useState(false);

  if (variant === 'compact') {
    return (
      <>
        <button
          type="button"
          onClick={() => setPlaying(true)}
          aria-label={`تشغيل الفيديو: ${title}`}
          className="media-thumb-video"
          style={poster ? { backgroundImage: `linear-gradient(rgba(0,0,0,.08), rgba(0,0,0,.26)), url(${poster})` } : undefined}
        >
          <span className="media-thumb-video-label">فيديو</span>
        </button>
        {playing ? (
          <div className="video-lightbox" role="dialog" aria-modal="true" aria-label={title}>
            <div className="video-lightbox-inner">
              <button className="video-lightbox-close" type="button" onClick={() => setPlaying(false)}>إغلاق</button>
              <video controls autoPlay playsInline preload="metadata" src={src} poster={poster || undefined}>
                متصفحك لا يدعم تشغيل الفيديو.
              </video>
            </div>
          </div>
        ) : null}
      </>
    );
  }

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
