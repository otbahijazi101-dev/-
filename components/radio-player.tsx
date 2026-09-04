'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

export type RadioItem = {
  id: string;
  title: string;
  creator: string;
  src: string;
  mimeType?: string | null;
  coverUrl?: string | null;
  href?: string | null;
  startAt?: number;
};

declare global {
  interface WindowEventMap {
    'radio-play': CustomEvent<RadioItem>;
    'radio-queue': CustomEvent<RadioItem>;
  }
}

export function RadioPlayer() {
  const [current, setCurrent] = useState<RadioItem | null>(null);
  const [queue, setQueue] = useState<RadioItem[]>([]);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const isVideo = Boolean(current?.mimeType?.startsWith('video/'));
  const activeMedia = () => (isVideo ? videoRef.current : audioRef.current);

  useEffect(() => {
    const onPlay = (event: WindowEventMap['radio-play']) => {
      setCurrent(event.detail);
      setPlaying(true);
    };
    const onQueue = (event: WindowEventMap['radio-queue']) => {
      setQueue((items) => items.some((item) => item.id === event.detail.id) ? items : [...items, event.detail]);
    };
    window.addEventListener('radio-play', onPlay);
    window.addEventListener('radio-queue', onQueue);
    return () => {
      window.removeEventListener('radio-play', onPlay);
      window.removeEventListener('radio-queue', onQueue);
    };
  }, []);

  useEffect(() => {
    if (!current) return;
    const timer = window.setTimeout(() => {
      const media = activeMedia();
      if (!media) return;
      if (current.startAt) media.currentTime = current.startAt;
      media.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [current, isVideo]);

  const bars = useMemo(() => Array.from({ length: 44 }, (_, index) => 20 + ((index * 31 + (current?.title.length ?? 7) * 11) % 72)), [current?.title]);

  function togglePlay() {
    const media = activeMedia();
    if (!media) return;
    if (media.paused) media.play().then(() => setPlaying(true)).catch(() => undefined);
    else {
      media.pause();
      setPlaying(false);
    }
  }

  function next() {
    const [first, ...rest] = queue;
    if (!first) {
      setPlaying(false);
      return;
    }
    setQueue(rest);
    setCurrent(first);
    setProgress(0);
  }

  function seek(event: React.MouseEvent<HTMLButtonElement>) {
    const media = activeMedia();
    if (!media || !duration) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    media.currentTime = ratio * duration;
  }

  if (!current) return null;

  return (
    <aside className="radio-player-shell" aria-label="مشغل الراديو">
      <div className="radio-player-inner container">
        <div className="radio-player-title">
          <strong>{current.title}</strong>
          <span>{current.creator}</span>
        </div>
        {isVideo ? (
          <video
            ref={videoRef}
            className="radio-player-video"
            src={current.src}
            playsInline
            onTimeUpdate={(e) => setProgress(e.currentTarget.duration ? e.currentTarget.currentTime / e.currentTarget.duration : 0)}
            onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
            onEnded={next}
          />
        ) : (
          <audio
            ref={audioRef}
            src={current.src}
            onTimeUpdate={(e) => setProgress(e.currentTarget.duration ? e.currentTarget.currentTime / e.currentTarget.duration : 0)}
            onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
            onEnded={next}
          />
        )}
        <button className="player-main-button" type="button" onClick={togglePlay} aria-label={playing ? 'إيقاف مؤقت' : 'تشغيل'}>
          {playing ? 'Ⅱ' : '▶'}
        </button>
        <button className="player-wave" type="button" onClick={seek} aria-label="الانتقال داخل الملف">
          {bars.map((height, index) => (
            <span key={index} className={index / bars.length <= progress ? 'played' : ''} style={{ height: `${height}%` }} />
          ))}
        </button>
        <button className="button button-ghost button-small" type="button" onClick={next} disabled={!queue.length}>التالي {queue.length ? `(${queue.length})` : ''}</button>
        <button className="player-close" type="button" onClick={() => { activeMedia()?.pause(); setCurrent(null); setQueue([]); }} aria-label="إغلاق المشغل">×</button>
      </div>
    </aside>
  );
}
