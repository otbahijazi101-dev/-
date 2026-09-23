'use client';

import type { RadioItem } from '@/components/radio-player';

export function PlaylistTrackButton({ items, index }: { items: RadioItem[]; index: number }) {
  function playFromHere() {
    const first = items[index];
    if (!first) return;
    window.dispatchEvent(new CustomEvent('radio-play', { detail: first }));
    items.slice(index + 1).forEach((item) => window.dispatchEvent(new CustomEvent('radio-queue', { detail: item })));
  }

  return <button className="button button-ghost button-small" type="button" onClick={playFromHere} disabled={!items[index]} aria-label={`${items[index]?.title || 'المقطع'}: تشغيل من هنا`}>تشغيل</button>;
}
