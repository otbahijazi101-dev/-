'use client';

import { FormEvent, useMemo, useState } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';

export function PlaylistCreator({ userId }: { userId: string }) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const title = String(form.get('title') ?? '').trim();
    if (!title) return;
    setBusy(true);
    setError(null);
    const { error: insertError } = await supabase.from('playlists').insert({ owner_id: userId, title });
    setBusy(false);
    if (insertError) {
      setError('تعذر إنشاء القائمة.');
      return;
    }
    window.location.reload();
  }

  return (
    <form className="playlist-create-form" onSubmit={submit}>
      <input name="title" maxLength={120} required placeholder="اسم قائمة التشغيل" />
      <button className="button button-dark button-small" type="submit" disabled={busy}>{busy ? '...' : 'إنشاء قائمة'}</button>
      {error ? <small>{error}</small> : null}
    </form>
  );
}
