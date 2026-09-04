'use client';

import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';

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
    'radio-register': CustomEvent<RadioItem>;
    'radio-unregister': CustomEvent<{ id: string }>;
  }
}

export function RadioPlayer() {
  const [current, setCurrent] = useState<RadioItem | null>(null);
  const [queue, setQueue] = useState<RadioItem[]>([]);
  const [library, setLibrary] = useState<RadioItem[]>([]);
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
      setProgress(0);
      setPlaying(true);
    };
    const onQueue = (event: WindowEventMap['radio-queue']) => {
      setQueue((items) => items.some((item) => item.id === event.detail.id) ? items : [...items, event.detail]);
    };
    const onRegister = (event: WindowEventMap['radio-register']) => {
      setLibrary((items) => {
        const index = items.findIndex((item) => item.id === event.detail.id);
        if (index === -1) return [...items, event.detail];
        const copy = [...items];
        copy[index] = event.detail;
        return copy;
      });
    };
    const onUnregister = (event: WindowEventMap['radio-unregister']) => {
      setLibrary((items) => items.filter((item) => item.id !== event.detail.id));
    };

    window.addEventListener('radio-play', onPlay);
    window.addEventListener('radio-queue', onQueue);
    window.addEventListener('radio-register', onRegister);
    window.addEventListener('radio-unregister', onUnregister);
    return () => {
      window.removeEventListener('radio-play', onPlay);
      window.removeEventListener('radio-queue', onQueue);
      window.removeEventListener('radio-register', onRegister);
      window.removeEventListener('radio-unregister', onUnregister);
    };
  }, []);

  useEffect(() => {
    if (!current) return;
    const timer = window.setTimeout(() => {
      const media = activeMedia();
      if (!media) return;
      media.currentTime = current.startAt || 0;
      media.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [current, isVideo]);

  const bars = useMemo(
    () => Array.from({ length: 44 }, (_, index) => 20 + ((index * 31 + (current?.title.length ?? 7) * 11) % 72)),
    [current?.title],
  );

  const automaticNext = useMemo(() => {
    if (!current || queue.length) return null;
    const index = library.findIndex((item) => item.id === current.id);
    return index >= 0 ? library[index + 1] ?? null : null;
  }, [current, library, queue.length]);

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
    if (first) {
      setQueue(rest);
      setCurrent({ ...first, startAt: 0 });
      setProgress(0);
      return;
    }
    if (automaticNext) {
      setCurrent({ ...automaticNext, startAt: 0 });
      setProgress(0);
      return;
    }
    setPlaying(false);
  }

  function seek(event: MouseEvent<HTMLButtonElement>) {
    const media = activeMedia();
    if (!media || !duration) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    media.currentTime = ratio * duration;
  }

  if (!current) return null;

  const hasNext = Boolean(queue.length || automaticNext);

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
            poster={current.coverUrl || undefined}
            playsInline
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onTimeUpdate={(e) => setProgress(e.currentTarget.duration ? e.currentTarget.currentTime / e.currentTarget.duration : 0)}
            onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
            onEnded={next}
          />
        ) : (
          <audio
            ref={audioRef}
            src={current.src}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onTimeUpdate={(e) => setProgress(e.currentTarget.duration ? e.currentTarget.currentTime / e.currentTarget.duration : 0)}
            onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
            onEnded={next}
          />
        )}
        <button className="player-text-button player-primary-control" type="button" onClick={togglePlay}>
          {playing ? 'إيقاف' : 'تشغيل'}
        </button>
        <button className="player-wave" type="button" onClick={seek} aria-label="الانتقال داخل الملف">
          {bars.map((height, index) => (
            <span key={index} className={index / bars.length <= progress ? 'played' : ''} style={{ height: `${height}%` }} />
          ))}
        </button>
        <button className="player-text-button" type="button" onClick={next} disabled={!hasNext}>
          التالي{queue.length ? ` (${queue.length})` : ''}
        </button>
        <button className="player-text-button player-close" type="button" onClick={() => { activeMedia()?.pause(); setCurrent(null); setQueue([]); }}>إغلاق</button>
      </div>
    </aside>
  );
}
