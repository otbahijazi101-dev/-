'use client';

import { FormEvent, useMemo, useState } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';

const MAX_FILE_SIZE = 50 * 1024 * 1024;

const extensionByMime: Record<string, string> = {
  'audio/mpeg': 'mp3',
  'audio/mp4': 'm4a',
  'audio/x-m4a': 'm4a',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/ogg': 'ogg',
  'audio/webm': 'webm',
  'audio/aac': 'aac',
  'audio/flac': 'flac',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
};

const supportedMimeTypes = new Set(Object.keys(extensionByMime));

export function UploadForm({ userId, isAdmin }: { userId: string; isAdmin: boolean }) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const form = new FormData(event.currentTarget);
    const title = String(form.get('title') ?? '').trim();
    const description = String(form.get('description') ?? '').trim();
    const category = String(form.get('category') ?? '').trim();
    const file = form.get('media');

    if (title.length < 2 || title.length > 120) {
      setError('العنوان يجب أن يكون بين حرفين و120 حرفًا.');
      return;
    }
    if (description.length > 2000) {
      setError('الوصف طويل جدًا.');
      return;
    }
    if (!(file instanceof File) || file.size === 0) {
      setError('اختر ملفًا صوتيًا أو فيديو.');
      return;
    }
    if (!supportedMimeTypes.has(file.type)) {
      setError('نوع الملف غير مدعوم. استخدم ملفًا صوتيًا أو MP4 أو WebM أو MOV.');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError('حجم الملف يجب ألا يتجاوز 50 ميجابايت.');
      return;
    }

    setBusy(true);
    const extension = extensionByMime[file.type] ?? 'media';
    const storagePath = `${userId}/${crypto.randomUUID()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from('audio')
      .upload(storagePath, file, {
        cacheControl: '3600',
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      setBusy(false);
      setError('تعذر رفع الملف. حاول مرة أخرى.');
      return;
    }

    const now = new Date().toISOString();
    const { error: insertError } = await supabase.from('tracks').insert({
      owner_id: userId,
      title,
      description: description || null,
      category: category || null,
      storage_path: storagePath,
      mime_type: file.type,
      file_size: file.size,
      status: isAdmin ? 'published' : 'pending',
      published_at: isAdmin ? now : null,
    });

    if (insertError) {
      await supabase.storage.from('audio').remove([storagePath]);
      setBusy(false);
      setError('تم رفع الملف لكن تعذر تسجيله. أعد المحاولة.');
      return;
    }

    window.location.href = '/my-tracks?uploaded=1';
  }

  return (
    <form className="stack-form" onSubmit={handleSubmit}>
      {error ? <div className="form-alert">{error}</div> : null}
      <label>
        <span>عنوان الملف</span>
        <input name="title" required minLength={2} maxLength={120} placeholder="اكتب عنوانًا واضحًا" />
      </label>
      <label>
        <span>التصنيف</span>
        <select name="category" defaultValue="">
          <option value="">بدون تصنيف</option>
          <option>بودكاست</option>
          <option>قصة</option>
          <option>تاريخ</option>
          <option>ثقافة</option>
          <option>وثائقي</option>
          <option>إنشاد</option>
          <option>فيديو</option>
          <option>أخرى</option>
        </select>
      </label>
      <label>
        <span>الوصف</span>
        <textarea name="description" maxLength={2000} placeholder="نبذة قصيرة عن هذا المحتوى" />
      </label>
      <label>
        <span>الملف الصوتي أو الفيديو</span>
        <input name="media" type="file" accept="audio/*,video/mp4,video/webm,video/quicktime" required />
        <small>صوت: MP3 وM4A وWAV وOGG وغيرها. فيديو: MP4 أو WebM أو MOV. الحد الحالي 50 ميجابايت للملف.</small>
      </label>
      <button className="button button-dark button-wide" type="submit" disabled={busy}>
        {busy ? 'جاري الرفع...' : isAdmin ? 'ارفع وانشر مباشرة' : 'ارفع للمراجعة'}
      </button>
    </form>
  );
}
