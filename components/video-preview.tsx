'use client';

import { useState } from 'react';

export function VideoPreview({ src, title }: { src: string; title: string }) {
  const [playing, setPlaying] = useState(false);

  if (playing) {
    return (
      <div style={{ width: '100%', aspectRatio: '16 / 9', background: '#000', overflow: 'hidden' }}>
        <video
          controls
          autoPlay
          playsInline
          preload="metadata"
          src={src}
          style={{ width: '100%', height: '100%', display: 'block', objectFit: 'contain', background: '#000' }}
        >
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
      style={{
        width: '100%',
        aspectRatio: '16 / 9',
        border: 0,
        padding: 0,
        position: 'relative',
        overflow: 'hidden',
        background: 'linear-gradient(135deg, #0a5338 0%, #123d2d 58%, #291817 100%)',
        color: '#fff',
        cursor: 'pointer',
      }}
    >
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          opacity: 0.18,
        }}
      >
        {Array.from({ length: 34 }).map((_, index) => (
          <span
            key={index}
            style={{
              width: 4,
              height: `${18 + ((index * 23) % 62)}%`,
              maxHeight: 92,
              borderRadius: 99,
              background: '#fff',
            }}
          />
        ))}
      </span>
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          display: 'grid',
          placeItems: 'center',
        }}
      >
        <span
          style={{
            width: 78,
            height: 78,
            borderRadius: '50%',
            display: 'grid',
            placeItems: 'center',
            background: 'rgba(255,255,255,.94)',
            color: '#111410',
            fontSize: 30,
            paddingInlineStart: 5,
            boxShadow: '0 14px 40px rgba(0,0,0,.24)',
          }}
        >
          ▶
        </span>
      </span>
      <span
        style={{
          position: 'absolute',
          insetInline: 22,
          bottom: 18,
          textAlign: 'right',
          fontWeight: 800,
          fontSize: 14,
          textShadow: '0 2px 14px rgba(0,0,0,.45)',
        }}
      >
        اضغط للمشاهدة
      </span>
    </button>
  );
}
