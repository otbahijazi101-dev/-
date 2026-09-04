'use client';

import { useState } from 'react';

export function VideoPreview({ src, title }: { src: string; title: string }) {
  const [playing, setPlaying] = useState(false);

  if (playing) {
    return (
      <div
        style={{
          width: '100%',
          aspectRatio: '16 / 9',
          background: '#000',
          overflow: 'hidden',
        }}
      >
        <video
          controls
          autoPlay
          playsInline
          preload="metadata"
          src={src}
          style={{
            width: '100%',
            height: '100%',
            display: 'block',
            objectFit: 'contain',
            background: '#000',
          }}
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
        height: 'clamp(110px, 9vw, 165px)',
        border: 0,
        padding: 0,
        position: 'relative',
        overflow: 'hidden',
        background: 'linear-gradient(100deg, #0a5338 0%, #103f30 52%, #1c1d19 100%)',
        color: '#fff',
        cursor: 'pointer',
        display: 'block',
      }}
    >
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(90deg, rgba(255,255,255,.02), transparent 42%, rgba(0,0,0,.18))',
        }}
      />

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
            width: 58,
            height: 58,
            borderRadius: '50%',
            display: 'grid',
            placeItems: 'center',
            background: 'rgba(255,255,255,.94)',
            color: '#111410',
            fontSize: 23,
            paddingInlineStart: 4,
            boxShadow: '0 10px 30px rgba(0,0,0,.22)',
          }}
        >
          ▶
        </span>
      </span>

      <span
        style={{
          position: 'absolute',
          insetInlineEnd: 22,
          bottom: 16,
          fontWeight: 800,
          fontSize: 13,
          textShadow: '0 2px 12px rgba(0,0,0,.5)',
        }}
      >
        اضغط للمشاهدة
      </span>
    </button>
  );
}
