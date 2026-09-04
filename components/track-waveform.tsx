'use client';

import type { RadioItem } from '@/components/radio-player';

export function TrackWaveform({
  item,
  waveform,
  durationSeconds,
}: {
  item: RadioItem;
  waveform?: number[] | null;
  durationSeconds?: number | null;
}) {
  const bars = waveform?.length
    ? waveform.slice(0, 64)
    : Array.from({ length: 48 }, (_, index) => 0.22 + (((index * 19 + item.title.length * 7) % 68) / 100));

  function playFrom(event: React.MouseEvent<HTMLButtonElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    window.dispatchEvent(new CustomEvent('radio-play', {
      detail: {
        ...item,
        startAt: durationSeconds ? Math.floor(durationSeconds * ratio) : 0,
      },
    }));
  }

  return (
    <button className="track-waveform" type="button" onClick={playFrom} aria-label={`تشغيل ${item.title} من موضع تختاره`}>
      {bars.map((value, index) => (
        <span key={index} style={{ height: `${Math.max(14, Math.min(100, value * 100))}%` }} />
      ))}
    </button>
  );
}
