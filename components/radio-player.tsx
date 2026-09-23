'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import { savedPositionFor, writeListeningProgress } from '@/lib/listening-history';

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
    'radio-library-request': Event;
  }
}

function PlayPauseIcon({ playing }: { playing: boolean }) {
  if (playing) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
        <path d="M9 6v12M15 6v12" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m9 6 9 6-9 6Z" fill="currentColor" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

export function RadioPlayer({ siteName }: { siteName: string }) {
  const [current, setCurrent] = useState<RadioItem | null>(null);
  const [queue, setQueue] = useState<RadioItem[]>([]);
  const [library, setLibrary] = useState<RadioItem[]>([]);
  const [playing, setPlaying] = useState(false);
  const [playError, setPlayError] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastHistoryWrite = useRef(0);
  const playRequest = useRef(0);
  const progressStep = useRef(-1);

  const isVideo = Boolean(current?.mimeType?.startsWith('video/'));
  const activeMedia = useCallback(() => (isVideo ? videoRef.current : audioRef.current), [isVideo]);

  // Keep the audio element mounted before the first tap. iOS requires the first
  // play() call to happen in the same user gesture, not in an effect or timer.
  const startAudio = useCallback((item: RadioItem) => {
    const audio = audioRef.current;
    if (!audio) return;
    const request = ++playRequest.current;
    if (audio.getAttribute('src') !== item.src) {
      audio.src = item.src;
      audio.load();
    }
    const startAt = Math.max(0, item.startAt || 0);
    if (startAt) {
      const seek = () => {
        try { audio.currentTime = Math.min(startAt, Math.max(0, audio.duration - 0.25)); } catch { /* wait for metadata */ }
      };
      if (audio.readyState >= 1) seek();
      else audio.addEventListener('loadedmetadata', seek, { once: true });
    } else {
      try { audio.currentTime = 0; } catch { /* wait for metadata */ }
    }
    setPlayError(false);
    void audio.play().then(() => {
      if (playRequest.current === request) setPlaying(true);
    }).catch(() => {
      if (playRequest.current !== request) return;
      setPlaying(false);
      setPlayError(true);
    });
  }, []);

  useEffect(() => {
    const onPlay = (event: WindowEventMap['radio-play']) => {
      const startAt = event.detail.startAt ?? savedPositionFor(event.detail.id);
      const item = { ...event.detail, startAt };
      if (!item.mimeType?.startsWith('video/')) {
        videoRef.current?.pause();
        startAudio(item);
      } else {
        playRequest.current++;
        audioRef.current?.pause();
        setPlayError(false);
      }
      setCurrent(item);
      setQueue([]);
      setProgress(0);
      progressStep.current = -1;
      setDuration(0);
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
    // Cards can mount before the player subscribes; request their current items.
    window.dispatchEvent(new Event('radio-library-request'));
    return () => {
      window.removeEventListener('radio-play', onPlay);
      window.removeEventListener('radio-queue', onQueue);
      window.removeEventListener('radio-register', onRegister);
      window.removeEventListener('radio-unregister', onUnregister);
    };
  }, [startAudio]);

  useEffect(() => {
    if (!current || !isVideo) return;
    const timer = window.setTimeout(() => {
      const media = activeMedia();
      if (!media) return;
      const startAt = Math.max(0, current.startAt || 0);
      if (Number.isFinite(media.duration) && media.duration > 0) media.currentTime = Math.min(startAt, Math.max(0, media.duration - 0.25));
      else media.currentTime = startAt;
      media.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [activeMedia, current, isVideo]);

  const bars = useMemo(
    () => Array.from({ length: 44 }, (_, index) => 20 + ((index * 31 + (current?.title.length ?? 7) * 11) % 72)),
    [current?.title],
  );

  const automaticNext = useMemo(() => {
    if (!current || queue.length) return null;
    const index = library.findIndex((item) => item.id === current.id);
    return index >= 0 ? library[index + 1] ?? null : null;
  }, [current, library, queue.length]);

  const remember = useCallback((media: HTMLMediaElement, force = false) => {
    if (!current) return;
    const now = Date.now();
    if (!force && now - lastHistoryWrite.current < 5000) return;
    lastHistoryWrite.current = now;
    writeListeningProgress({
      id: current.id,
      title: current.title,
      creator: current.creator,
      mimeType: current.mimeType ?? null,
      position: media.currentTime || 0,
      duration: Number.isFinite(media.duration) ? media.duration : 0,
    });
  }, [current]);

  const next = useCallback(() => {
    const media = activeMedia();
    if (media) {
      remember(media, true);
      media.pause();
    }
    const [first, ...rest] = queue;
    if (first) {
      setQueue(rest);
      setCurrent({ ...first, startAt: 0 });
      if (!first.mimeType?.startsWith('video/')) startAudio({ ...first, startAt: 0 });
      setProgress(0);
      progressStep.current = -1;
      setDuration(0);
      return;
    }
    if (automaticNext) {
      setCurrent({ ...automaticNext, startAt: 0 });
      if (!automaticNext.mimeType?.startsWith('video/')) startAudio({ ...automaticNext, startAt: 0 });
      setProgress(0);
      progressStep.current = -1;
      setDuration(0);
      return;
    }
    setPlaying(false);
  }, [activeMedia, automaticNext, queue, remember, startAudio]);

  useEffect(() => {
    if (!current || !('mediaSession' in navigator)) return;

    if (typeof MediaMetadata !== 'undefined') {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: current.title,
        artist: current.creator,
        album: siteName,
        artwork: current.coverUrl ? [{ src: current.coverUrl }] : [],
      });
    }

    const safeHandler = (action: MediaSessionAction, handler: MediaSessionActionHandler | null) => {
      try { navigator.mediaSession.setActionHandler(action, handler); } catch { /* unsupported action */ }
    };

    safeHandler('play', () => { void activeMedia()?.play(); });
    safeHandler('pause', () => activeMedia()?.pause());
    safeHandler('nexttrack', () => next());
    safeHandler('seekbackward', (details) => {
      const media = activeMedia();
      if (!media) return;
      media.currentTime = Math.max(0, media.currentTime - (details.seekOffset || 10));
    });
    safeHandler('seekforward', (details) => {
      const media = activeMedia();
      if (!media) return;
      const target = media.currentTime + (details.seekOffset || 10);
      media.currentTime = Number.isFinite(media.duration) ? Math.min(media.duration, target) : target;
    });
    safeHandler('seekto', (details) => {
      const media = activeMedia();
      if (!media || details.seekTime == null) return;
      media.currentTime = details.seekTime;
    });

    return () => {
      safeHandler('play', null);
      safeHandler('pause', null);
      safeHandler('nexttrack', null);
      safeHandler('seekbackward', null);
      safeHandler('seekforward', null);
      safeHandler('seekto', null);
    };
  }, [activeMedia, current, next, siteName]);

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.playbackState = current ? (playing ? 'playing' : 'paused') : 'none';
  }, [current, playing]);

  useEffect(() => {
    if (!current) return;
    const saveBeforeLeaving = () => {
      const media = activeMedia();
      if (media) remember(media, true);
    };
    window.addEventListener('pagehide', saveBeforeLeaving);
    window.addEventListener('beforeunload', saveBeforeLeaving);
    return () => {
      window.removeEventListener('pagehide', saveBeforeLeaving);
      window.removeEventListener('beforeunload', saveBeforeLeaving);
    };
  }, [activeMedia, current, remember]);

  function togglePlay() {
    const media = activeMedia();
    if (!media) return;
    if (media.paused) void media.play().then(() => { setPlaying(true); setPlayError(false); }).catch(() => setPlayError(true));
    else {
      remember(media, true);
      media.pause();
      setPlaying(false);
    }
  }

  function seek(event: MouseEvent<HTMLButtonElement>) {
    const media = activeMedia();
    if (!media || !duration) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    media.currentTime = ratio * duration;
    remember(media, true);
  }

  function onTimeUpdate(media: HTMLMediaElement) {
    const mediaDuration = Number.isFinite(media.duration) ? media.duration : 0;
    const ratio = mediaDuration ? media.currentTime / mediaDuration : 0;
    const step = Math.floor(ratio * 44);
    if (step !== progressStep.current) {
      progressStep.current = step;
      setProgress(ratio);
    }
    remember(media);
    if ('mediaSession' in navigator && mediaDuration > 0 && media.currentTime <= mediaDuration) {
      try {
        navigator.mediaSession.setPositionState({
          duration: mediaDuration,
          playbackRate: media.playbackRate || 1,
          position: Math.max(0, Math.min(media.currentTime, mediaDuration)),
        });
      } catch { /* Safari/older Chromium can reject transient states */ }
    }
  }

  function closePlayer() {
    playRequest.current++;
    const media = activeMedia();
    if (media) {
      remember(media, true);
      media.pause();
    }
    setCurrent(null);
    setQueue([]);
  }

  const hasNext = Boolean(queue.length || automaticNext);
  const primaryLabel = playing ? 'إيقاف مؤقت' : 'تشغيل';

  return (
    <aside className="radio-player-shell" aria-label={`مشغل ${siteName}`} style={!current ? { display: 'none' } : undefined}>
    <audio
      ref={audioRef}
      controls={playError}
      aria-label="مشغل الصوت"
      style={playError ? { display: 'block', width: '100%' } : { position: 'absolute', width: 0, height: 0, opacity: 0 }}
      onPlay={() => { setPlaying(true); setPlayError(false); }}
      onPause={(e) => { remember(e.currentTarget, true); setPlaying(false); }}
      onTimeUpdate={(e) => onTimeUpdate(e.currentTarget)}
      onLoadedMetadata={(e) => setDuration(Number.isFinite(e.currentTarget.duration) ? e.currentTarget.duration : 0)}
      onEnded={next}
    />
    {current ? (
      <div
        className="radio-player-inner container"
        style={!playing ? { minHeight: '64px', gridTemplateRows: 'auto' } : undefined}
      >
        <div className="radio-player-cover" aria-hidden="true" style={current.coverUrl ? { backgroundImage: `url(${current.coverUrl})` } : undefined}>
          {!current.coverUrl ? '♫' : null}
        </div>
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
            controls
            onPlay={() => setPlaying(true)}
            onPause={(e) => { remember(e.currentTarget, true); setPlaying(false); }}
            onTimeUpdate={(e) => onTimeUpdate(e.currentTarget)}
            onLoadedMetadata={(e) => setDuration(Number.isFinite(e.currentTarget.duration) ? e.currentTarget.duration : 0)}
            onEnded={next}
          />
        ) : null}
        <button
          className="player-icon-button player-primary-control"
          type="button"
          onClick={togglePlay}
          aria-label={primaryLabel}
          title={primaryLabel}
        >
          <PlayPauseIcon playing={playing} />
        </button>
        {duration > 0 && !isVideo ? (
          <button className="player-wave" type="button" onClick={seek} aria-label="الانتقال داخل الملف">
            {bars.map((height, index) => (
              <span key={index} className={index / bars.length <= progress ? 'played' : ''} style={{ height: `${height}%` }} />
            ))}
          </button>
        ) : null}
        <button className="player-text-button" type="button" onClick={next} disabled={!hasNext} aria-label="المقطع التالي">
          التالي{queue.length ? ` (${queue.length})` : ''}
        </button>
        <button
          className="player-icon-button player-close"
          type="button"
          onClick={closePlayer}
          aria-label="إغلاق المشغل"
          title="إغلاق المشغل"
        >
          <CloseIcon />
        </button>
        {playError && !isVideo ? <span style={{ gridColumn: '1 / -1' }}>إذا لم يبدأ الصوت، اضغط تشغيل في المشغل أعلاه.</span> : null}
      </div>
    ) : null}
    </aside>
  );
}
