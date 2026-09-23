'use client';

import { useState } from 'react';

export function SharePlaylistButton({ id, title }: { id: string; title: string }) {
  const [status, setStatus] = useState<'idle' | 'copied' | 'error'>('idle');

  async function share() {
    const url = new URL(`/community-playlists/${id}`, window.location.origin).toString();
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch { /* Dismissed share sheet; allow copying on the next tap. */ }
    }
    try {
      await navigator.clipboard.writeText(url);
      setStatus('copied');
    } catch { setStatus('error'); }
  }

  return <button className="button button-ghost button-small" type="button" onClick={share}>{status === 'copied' ? 'تم نسخ الرابط' : status === 'error' ? 'تعذر النسخ، انسخ عنوان الصفحة' : 'مشاركة القائمة'}</button>;
}
