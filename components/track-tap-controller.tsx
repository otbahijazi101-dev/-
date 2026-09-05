'use client';

import { useEffect } from 'react';
import type { RadioItem } from '@/components/radio-player';

function trackIdFromCard(card: Element | null) {
  if (!(card instanceof HTMLElement) || !card.id.startsWith('track-')) return null;
  return card.id.slice(6) || null;
}

export function TrackTapController() {
  useEffect(() => {
    let activeTrackId: string | null = null;
    let playing = false;
    let library: RadioItem[] = [];
    let queue: RadioItem[] = [];

    const sync = () => {
      document.querySelectorAll<HTMLElement>('.media-list-card[id^="track-"]').forEach((card) => {
        const id = trackIdFromCard(card);
        const isActive = Boolean(id && id === activeTrackId);
        const isPlaying = isActive && playing;
        card.classList.add('is-track-clickable');
        card.classList.toggle('is-track-active', isActive);
        card.classList.toggle('is-track-playing', isPlaying);
        card.title = isPlaying ? 'اضغط لإيقاف التشغيل' : 'اضغط للتشغيل';
        const button = card.querySelector<HTMLButtonElement>('.media-inline-play');
        if (button) {
          const label = isPlaying ? 'إيقاف' : 'تشغيل';
          button.setAttribute('aria-label', label);
          button.title = label;
        }
      });
    };

    const scheduleSync = () => window.requestAnimationFrame(sync);

    const advance = () => {
      const [queued, ...rest] = queue;
      if (queued) {
        queue = rest;
        activeTrackId = queued.id;
        playing = true;
        scheduleSync();
        return;
      }
      if (!activeTrackId) return;
      const index = library.findIndex((item) => item.id === activeTrackId);
      const next = index >= 0 ? library[index + 1] ?? null : null;
      activeTrackId = next?.id ?? null;
      playing = Boolean(next);
      scheduleSync();
    };

    const onPlayRequest = (event: Event) => {
      const item = (event as CustomEvent<RadioItem>).detail;
      if (!item?.id) return;
      activeTrackId = item.id;
      playing = true;
      scheduleSync();
    };

    const onRegister = (event: Event) => {
      const item = (event as CustomEvent<RadioItem>).detail;
      if (!item?.id) return;
      const index = library.findIndex((registered) => registered.id === item.id);
      if (index === -1) library = [...library, item];
      else {
        const copy = [...library];
        copy[index] = item;
        library = copy;
      }
      scheduleSync();
    };

    const onUnregister = (event: Event) => {
      const id = (event as CustomEvent<{ id: string }>).detail?.id;
      if (!id) return;
      library = library.filter((item) => item.id !== id);
    };

    const onQueue = (event: Event) => {
      const item = (event as CustomEvent<RadioItem>).detail;
      if (!item?.id || queue.some((queued) => queued.id === item.id)) return;
      queue = [...queue, item];
    };

    const onMediaPlay = (event: Event) => {
      const target = event.target;
      if (!(target instanceof HTMLMediaElement) || !target.closest('.radio-player-shell')) return;
      playing = true;
      scheduleSync();
    };

    const onMediaPause = (event: Event) => {
      const target = event.target;
      if (!(target instanceof HTMLMediaElement) || !target.closest('.radio-player-shell')) return;
      playing = false;
      scheduleSync();
    };

    const onEnded = (event: Event) => {
      const target = event.target;
      if (!(target instanceof HTMLMediaElement) || !target.closest('.radio-player-shell')) return;
      advance();
    };

    const onClickCapture = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      if (target.closest('.player-close')) {
        activeTrackId = null;
        playing = false;
        scheduleSync();
        return;
      }

      const playerButton = target.closest<HTMLButtonElement>('.radio-player-shell button');
      if (
        playerButton &&
        !playerButton.classList.contains('player-primary-control') &&
        !playerButton.classList.contains('player-close') &&
        playerButton.textContent?.trim().startsWith('التالي')
      ) {
        advance();
        return;
      }

      const directPlay = target.closest<HTMLButtonElement>('.media-inline-play');
      if (directPlay) {
        const id = trackIdFromCard(directPlay.closest('.media-list-card[id^="track-"]'));
        if (id && id === activeTrackId) {
          const primary = document.querySelector<HTMLButtonElement>('.player-primary-control');
          if (primary) {
            event.preventDefault();
            event.stopPropagation();
            primary.click();
          }
        }
        return;
      }

      if (target.closest('a,button,input,select,textarea,details,summary,label')) return;
      const card = target.closest<HTMLElement>('.media-list-card[id^="track-"]');
      const playButton = card?.querySelector<HTMLButtonElement>('.media-inline-play');
      if (playButton) playButton.click();
    };

    window.addEventListener('radio-play', onPlayRequest);
    window.addEventListener('radio-register', onRegister);
    window.addEventListener('radio-unregister', onUnregister);
    window.addEventListener('radio-queue', onQueue);
    document.addEventListener('play', onMediaPlay, true);
    document.addEventListener('pause', onMediaPause, true);
    document.addEventListener('ended', onEnded, true);
    document.addEventListener('click', onClickCapture, true);
    scheduleSync();

    return () => {
      window.removeEventListener('radio-play', onPlayRequest);
      window.removeEventListener('radio-register', onRegister);
      window.removeEventListener('radio-unregister', onUnregister);
      window.removeEventListener('radio-queue', onQueue);
      document.removeEventListener('play', onMediaPlay, true);
      document.removeEventListener('pause', onMediaPause, true);
      document.removeEventListener('ended', onEnded, true);
      document.removeEventListener('click', onClickCapture, true);
    };
  }, []);

  return null;
}
