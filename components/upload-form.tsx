'use client';

import { FormEvent, useMemo, useState } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';

const MAX_FILE_SIZE = 50 * 1024 * 1024;
const MAX_COVER_SIZE = 5 * 1024 * 1024;

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
const coverTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

function slugify(title: string) {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70) || 'track';
  return `${base}-${crypto.randomUUID().slice(0, 7)}`;
}

async function analyzeAudio(file: File) {
  try {
    const context = new AudioContext();
    const buffer = await context.decodeAudioData(await file.arrayBuffer());
    const data = buffer.getChannelData(0);
    const buckets = 56;
    const size = Math.max(1, Math.floor(data.length / buckets));
    const peaks: number[] = [];
    let max = 0;
    for (let index = 0; index < buckets; index += 1) {
      let peak = 0;
      const start = index * size;
      const end = Math.min(data.length, start + size);
      for (let cursor = start; cursor < end; cursor += Math.max(1, Math.floor(size / 300))) {
        peak = Math.max(peak, Math.abs(data[cursor] || 0));
      }
      peaks.push(peak);
      max = Math.max(max, peak);
    }
    await context.close();
    return {
      duration: Math.round(buffer.duration),
      waveform: peaks.map((value) => Number((value / (max || 1)).toFixed(3))),
    };
  } catch {
    return { duration: null as number | null, waveform: null as number[] | null };
  }
}

async function analyzeVideo(file: File) {
  return new Promise<{ duration: number | null; thumbnail: Blob | null }>((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.preload = 'metadata';
    const finish = (duration: number | null, thumbnail: Blob | null) => {
      URL.revokeObjectURL(url);
      resolve({ duration, thumbnail });
    };
    const failTimer = window.setTimeout(() => finish(null, null), 7000);
    video.onerror = () => {
      window.clearTimeout(failTimer);
      finish(null, null);
    };
    video.onloadedmetadata = () => {
      const duration = Number.isFinite(video.duration) ? Math.round(video.duration) : null;
      video.currentTime = Math.min(1, Math.max(0, (video.duration || 1) / 5));
      video.onseeked = () => {
        window.clearTimeout(failTimer);
        try {
          const width = 960;
          const height = Math.max(360, Math.round(width * (video.videoHeight || 540) / (video.videoWidth || 960)));
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          canvas.getContext('2d')?.drawImage(video, 0, 0, width, height);
          canvas.toBlob((blob) => finish(duration, blob), 'image/jpeg', 0.82);
        } catch {
          finish(duration, null);
        }
      };
    };
    video.src = url;
  });
}

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
    const tags = String(form.get('tags') ?? '')
      .split(/[,،]/)
      .map((tag) => tag.trim())
      .filter(Boolean)
      .slice(0, 12);
    const file = form.get('media');
    const coverInput = form.get('cover');

    if (title.length < 2 || title.length > 120) return setError('العنوان يجب أن يكون بين حرفين و120 حرفًا.');
    if (description.length > 2000) return setError('الوصف طويل جدًا.');
    if (!(file instanceof File) || file.size === 0) return setError('اختر ملفًا صوتيًا أو فيديو.');
    if (!supportedMimeTypes.has(file.type)) return setError('نوع الملف غير مدعوم. استخدم ملفًا صوتيًا أو MP4 أو WebM أو MOV.');
    if (file.size > MAX_FILE_SIZE) return setError('حجم الملف يجب ألا يتجاوز 50 ميجابايت.');
    if (coverInput instanceof File && coverInput.size > 0 && (!coverTypes.has(coverInput.type) || coverInput.size > MAX_COVER_SIZE)) {
      return setError('الغلاف يجب أن يكون JPG أو PNG أو WebP وأقل من 5 ميجابايت.');
    }

    setBusy(true);
    const isVideo = file.type.startsWith('video/');
    const mediaAnalysis = isVideo ? await analyzeVideo(file) : await analyzeAudio(file);
    const generatedThumbnail = isVideo && 'thumbnail' in mediaAnalysis ? mediaAnalysis.thumbnail : null;
    const waveform = !isVideo && 'waveform' in mediaAnalysis ? mediaAnalysis.waveform : null;
    const duration = mediaAnalysis.duration;

    const extension = extensionByMime[file.type] ?? 'media';
    const storagePath = `${userId}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage.from('audio').upload(storagePath, file, {
      cacheControl: '3600', contentType: file.type, upsert: false,
    });
    if (uploadError) {
      setBusy(false);
      return setError('تعذر رفع الملف. حاول مرة أخرى.');
    }

    let coverPath: string | null = null;
    let coverBlob: File | Blob | null = coverInput instanceof File && coverInput.size > 0 ? coverInput : generatedThumbnail;
    if (coverBlob) {
      const coverExt = coverBlob.type === 'image/png' ? 'png' : coverBlob.type === 'image/webp' ? 'webp' : 'jpg';
      coverPath = `${userId}/${crypto.randomUUID()}.${coverExt}`;
      const { error: coverError } = await supabase.storage.from('covers').upload(coverPath, coverBlob, {
        cacheControl: '3600', contentType: coverBlob.type || 'image/jpeg', upsert: false,
      });
      if (coverError) coverPath = null;
    }

    const now = new Date().toISOString();
    const { error: insertError } = await supabase.from('tracks').insert({
      owner_id: userId,
      title,
      slug: slugify(title),
      description: description || null,
      category: category || null,
      tags,
      cover_path: coverPath,
      duration_seconds: duration,
      waveform,
      storage_path: storagePath,
      mime_type: file.type,
      file_size: file.size,
      status: isAdmin ? 'published' : 'pending',
      published_at: isAdmin ? now : null,
    });

    if (insertError) {
      await supabase.storage.from('audio').remove([storagePath]);
      if (coverPath) await supabase.storage.from('covers').remove([coverPath]);
      setBusy(false);
      return setError('تم رفع الملف لكن تعذر تسجيله. أعد المحاولة.');
    }

    window.location.href = '/my-tracks?uploaded=1';
  }

  return (
    <form className="stack-form" onSubmit={handleSubmit}>
      {error ? <div className="form-alert">{error}</div> : null}
      <label><span>عنوان الملف</span><input name="title" required minLength={2} maxLength={120} placeholder="اكتب عنوانًا واضحًا" /></label>
      <label>
        <span>التصنيف</span>
        <select name="category" defaultValue="">
          <option value="">بدون تصنيف</option><option>بودكاست</option><option>قصة</option><option>تاريخ</option><option>ثقافة</option><option>وثائقي</option><option>إنشاد</option><option>فيديو</option><option>أخرى</option>
        </select>
      </label>
      <label><span>الوسوم</span><input name="tags" maxLength={240} placeholder="مثال: تربية، قصة، تاريخ" /><small>افصل بين الوسوم بفاصلة.</small></label>
      <label><span>الوصف</span><textarea name="description" maxLength={2000} placeholder="نبذة قصيرة عن هذا المحتوى" /></label>
      <label><span>الغلاف - اختياري</span><input name="cover" type="file" accept="image/jpeg,image/png,image/webp" /><small>إذا كان الملف فيديو ولم ترفع غلافًا، سنحاول استخراج صورة معاينة تلقائيًا.</small></label>
      <label>
        <span>الملف الصوتي أو الفيديو</span>
        <input name="media" type="file" accept="audio/*,video/mp4,video/webm,video/quicktime" required />
        <small>صوت: MP3 وM4A وWAV وOGG وغيرها. فيديو: MP4 أو WebM أو MOV. الحد الحالي 50 ميجابايت للملف.</small>
      </label>
      <button className="button button-dark button-wide" type="submit" disabled={busy}>{busy ? 'جاري تجهيز الملف ورفعه...' : isAdmin ? 'ارفع وانشر مباشرة' : 'ارفع للمراجعة'}</button>
    </form>
  );
}
