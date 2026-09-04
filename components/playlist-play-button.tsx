'use client';

import type { RadioItem } from '@/components/radio-player';

export function PlaylistPlayButton({ items }: { items: RadioItem[] }) {
  function playAll() {
    const [first, ...rest] = items;
    if (!first) return;
    window.dispatchEvent(new CustomEvent('radio-play', { detail: first }));
    rest.forEach((item) => window.dispatchEvent(new CustomEvent('radio-queue', { detail: item })));
  }

  return (
    <button className="button button-dark button-small" type="button" onClick={playAll} disabled={!items.length}>
      تشغيل القائمة
    </button>
  );
}
