'use client';

import type { FormEvent } from 'react';

export function DeleteTrackForm({ trackId, title }: { trackId: string; title: string }) {
  function confirmDelete(event: FormEvent<HTMLFormElement>) {
    const ok = window.confirm(`حذف «${title}» نهائيًا؟ لن يمكن استرجاع الملف بعد الحذف.`);
    if (!ok) event.preventDefault();
  }

  return (
    <form action={`/api/tracks/${trackId}/delete`} method="post" onSubmit={confirmDelete}>
      <button className="button button-danger button-small track-delete-button" type="submit">حذف</button>
    </form>
  );
}
