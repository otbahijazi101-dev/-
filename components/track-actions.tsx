'use client';

import { useEffect, useMemo, useState } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import type { RadioItem } from '@/components/radio-player';

type Playlist = { id: string; title: string };

type OfflineEntry = {
  id: string;
  title: string;
  creator: string;
  mimeType: string;
  savedAt: number;
  size?: number | null;
};

const OFFLINE_CACHE = 'radio-offline-media-v1';
const OFFLINE_KEY = 'radio-offline-tracks-v1';

function readOfflineEntries(): OfflineEntry[] {
  try {
    const value = localStorage.getItem(OFFLINE_KEY);
    if (!value) return [];
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function formatBytes(value?: number | null) {
  if (!value || value <= 0) return null;
  if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} KB`;
  return `${(value / (1024 * 1024)).toFixed(value >= 10 * 1024 * 1024 ? 0 : 1)} MB`;
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m9 6 9 6-9 6Z" fill="currentColor" />
    </svg>
  );
}

export function TrackActions({
  item,
  userId,
  ownerId,
  compact = false,
  downloadUrl,
  downloadLabel = 'تحميل',
}: {
  item: RadioItem;
  userId?: string | null;
  ownerId?: string | null;
  compact?: boolean;
  downloadUrl?: string | null;
  downloadLabel?: string;
}) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [liked, setLiked] = useState(false);
  const [favorite, setFavorite] = useState(false);
  const [following, setFollowing] = useState(false);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [playlistId, setPlaylistId] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [savingOffline, setSavingOffline] = useState(false);
  const [savedOffline, setSavedOffline] = useState(false);
  const [offlineProgress, setOfflineProgress] = useState<number | null>(null);
  const [offlineSize, setOfflineSize] = useState<number | null>(null);
  const isAudio = Boolean(item.mimeType?.startsWith('audio/'));

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('radio-register', { detail: item }));
    return () => {
      window.dispatchEvent(new CustomEvent('radio-unregister', { detail: { id: item.id } }));
    };
  }, [item]);

  useEffect(() => {
    if (!isAudio) return;
    const saved = readOfflineEntries().find((entry) => entry.id === item.id);
    setSavedOffline(Boolean(saved));
    setOfflineSize(saved?.size ?? null);
  }, [isAudio, item.id]);

  useEffect(() => {
    if (!userId) return;
    void Promise.all([
      supabase.from('likes').select('track_id').eq('user_id', userId).eq('track_id', item.id).maybeSingle(),
      supabase.from('favorites').select('track_id').eq('user_id', userId).eq('track_id', item.id).maybeSingle(),
      ownerId && ownerId !== userId
        ? supabase.from('follows').select('followed_id').eq('follower_id', userId).eq('followed_id', ownerId).maybeSingle()
        : Promise.resolve({ data: null }),
      supabase.from('playlists').select('id,title').eq('owner_id', userId).order('created_at', { ascending: false }),
    ]).then(([likeResult, favoriteResult, followResult, playlistResult]) => {
      setLiked(Boolean(likeResult.data));
      setFavorite(Boolean(favoriteResult.data));
      setFollowing(Boolean(followResult.data));
      const rows = (playlistResult.data ?? []) as Playlist[];
      setPlaylists(rows);
      if (rows[0]) setPlaylistId(rows[0].id);
    });
  }, [item.id, ownerId, supabase, userId]);

  function requireLogin() {
    if (userId) return true;
    window.location.href = '/login';
    return false;
  }

  function play() {
    window.dispatchEvent(new CustomEvent('radio-play', { detail: item }));
  }

  function queue() {
    window.dispatchEvent(new CustomEvent('radio-queue', { detail: item }));
    setNotice('أضيف إلى الانتظار.');
  }

  async function toggleLike() {
    if (!requireLogin() || !userId) return;
    if (liked) {
      await supabase.from('likes').delete().eq('user_id', userId).eq('track_id', item.id);
      setLiked(false);
    } else {
      const { error } = await supabase.from('likes').insert({ user_id: userId, track_id: item.id });
      if (!error) setLiked(true);
    }
  }

  async function toggleFavorite() {
    if (!requireLogin() || !userId) return;
    if (favorite) {
      await supabase.from('favorites').delete().eq('user_id', userId).eq('track_id', item.id);
      setFavorite(false);
    } else {
      const { error } = await supabase.from('favorites').insert({ user_id: userId, track_id: item.id });
      if (!error) setFavorite(true);
    }
  }

  async function toggleFollow() {
    if (!requireLogin() || !userId || !ownerId || ownerId === userId) return;
    if (following) {
      await supabase.from('follows').delete().eq('follower_id', userId).eq('followed_id', ownerId);
      setFollowing(false);
    } else {
      const { error } = await supabase.from('follows').insert({ follower_id: userId, followed_id: ownerId });
      if (!error) setFollowing(true);
    }
  }

  async function share() {
    const url = item.href ? new URL(item.href, window.location.origin).toString() : window.location.href;
    if (navigator.share) {
      await navigator.share({ title: item.title, url }).catch(() => undefined);
      return;
    }
    await navigator.clipboard.writeText(url);
    setNotice('تم نسخ الرابط.');
  }

  async function addToPlaylist() {
    if (!requireLogin() || !userId) return;
    if (!playlistId) {
      setNotice('أنشئ قائمة تشغيل أولًا.');
      return;
    }
    const { error } = await supabase.from('playlist_items').insert({ playlist_id: playlistId, track_id: item.id });
    setNotice(error?.code === '23505' ? 'المقطع موجود بالفعل في هذه القائمة.' : error ? 'تعذر الإضافة.' : 'أضيف إلى القائمة.');
  }

  async function saveOffline() {
    if (!isAudio || savingOffline) return;
    if (savedOffline) {
      setNotice(`هذا الملف محفوظ بالفعل${offlineSize ? ` (${formatBytes(offlineSize)})` : ''}. يمكنك حذفه من «تنزيلاتي».`);
      return;
    }
    if (!('caches' in window)) {
      setNotice('الحفظ دون إنترنت غير مدعوم في هذا المتصفح.');
      return;
    }

    setSavingOffline(true);
    setOfflineProgress(0);
    setNotice('جارٍ الحفظ على الجهاز...');
    try {
      const response = await fetch(item.src);
      if (!response.ok) throw new Error('download_failed');

      const cache = await caches.open(OFFLINE_CACHE);
      const cacheKey = new Request(`/offline-media/${encodeURIComponent(item.id)}`);
      const cacheResponse = response.clone();
      const progressResponse = response.clone();
      const totalHeader = Number(response.headers.get('content-length') || 0);
      const cachePromise = cache.put(cacheKey, cacheResponse);

      let bytesDownloaded = 0;
      if (progressResponse.body) {
        const reader = progressResponse.body.getReader();
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          bytesDownloaded += value?.byteLength ?? 0;
          if (totalHeader > 0) setOfflineProgress(Math.min(100, Math.round((bytesDownloaded / totalHeader) * 100)));
        }
      } else if (totalHeader > 0) {
        bytesDownloaded = totalHeader;
      }

      await cachePromise;
      const size = bytesDownloaded || totalHeader || null;
      const current = readOfflineEntries().filter((entry) => entry.id !== item.id);
      const next: OfflineEntry[] = [
        {
          id: item.id,
          title: item.title,
          creator: item.creator,
          mimeType: item.mimeType || 'audio/mpeg',
          savedAt: Date.now(),
          size,
        },
        ...current,
      ];
      localStorage.setItem(OFFLINE_KEY, JSON.stringify(next));
      setSavedOffline(true);
      setOfflineSize(size);
      setOfflineProgress(100);
      setNotice(`تم الحفظ${size ? ` (${formatBytes(size)})` : ''}. سيعمل من «تنزيلاتي» بدون إنترنت.`);
      window.dispatchEvent(new CustomEvent('radio-offline-changed'));

      if (navigator.storage?.persist) void navigator.storage.persist().catch(() => false);
    } catch {
      setNotice('تعذر الحفظ دون إنترنت. حاول مرة أخرى أثناء اتصال جيد.');
    } finally {
      setSavingOffline(false);
      window.setTimeout(() => setOfflineProgress(null), 1200);
    }
  }

  const offlineButtonLabel = savingOffline
    ? offlineProgress != null && offlineProgress > 0 ? `جارٍ الحفظ ${offlineProgress}%` : 'جارٍ الحفظ...'
    : savedOffline ? `محفوظ دون إنترنت${offlineSize ? ` · ${formatBytes(offlineSize)}` : ''}` : 'حفظ دون إنترنت';

  if (compact) {
    return (
      <div className="media-compact-controls">
        <button className="media-inline-play" type="button" onClick={play} aria-label="تشغيل" title="تشغيل"><PlayIcon /></button>
        <details className="media-actions-compact">
          <summary aria-label="خيارات المقطع">•••</summary>
          <div className="media-action-popover">
            <button type="button" onClick={play}>تشغيل الآن</button>
            <button type="button" onClick={queue}>إضافة إلى الانتظار</button>
            {isAudio ? (
              <button type="button" onClick={saveOffline} disabled={savingOffline}>
                {offlineButtonLabel}
              </button>
            ) : null}
            <button type="button" onClick={toggleLike}>{liked ? 'إلغاء الإعجاب' : 'إعجاب'}</button>
            <button type="button" onClick={toggleFavorite}>{favorite ? 'إزالة من المحفوظات' : 'حفظ'}</button>
            {ownerId && ownerId !== userId ? (
              <button type="button" onClick={toggleFollow}>{following ? 'إلغاء المتابعة' : 'متابعة الناشر'}</button>
            ) : null}
            <button type="button" onClick={share}>مشاركة</button>
            {downloadUrl ? <a href={downloadUrl} download>{downloadLabel}</a> : null}
            {userId && playlists.length ? (
              <div className="playlist-inline-add">
                <select value={playlistId} onChange={(e) => setPlaylistId(e.target.value)} aria-label="قائمة التشغيل">
                  {playlists.map((playlist) => <option value={playlist.id} key={playlist.id}>{playlist.title}</option>)}
                </select>
                <button type="button" onClick={addToPlaylist}>أضف إلى القائمة</button>
              </div>
            ) : null}
            {notice ? <small className="action-notice">{notice}</small> : null}
          </div>
        </details>
      </div>
    );
  }

  return (
    <div className="track-actions-wrap">
      <div className="track-actions-row">
        <button className="button button-dark button-small" type="button" onClick={play}>تشغيل</button>
        <button className="button button-ghost button-small" type="button" onClick={queue}>انتظار</button>
        {isAudio ? <button className="button button-ghost button-small" type="button" onClick={saveOffline} disabled={savingOffline}>{offlineButtonLabel}</button> : null}
        <button className="button button-ghost button-small" type="button" onClick={toggleLike}>{liked ? 'تم الإعجاب' : 'إعجاب'}</button>
        <button className="button button-ghost button-small" type="button" onClick={toggleFavorite}>{favorite ? 'محفوظ' : 'حفظ'}</button>
        {ownerId && ownerId !== userId ? (
          <button className="button button-ghost button-small" type="button" onClick={toggleFollow}>{following ? 'تتابعه' : 'متابعة'}</button>
        ) : null}
        <button className="button button-ghost button-small" type="button" onClick={share}>مشاركة</button>
      </div>
      {userId && playlists.length ? (
        <div className="playlist-inline-add">
          <select value={playlistId} onChange={(e) => setPlaylistId(e.target.value)} aria-label="قائمة التشغيل">
            {playlists.map((playlist) => <option value={playlist.id} key={playlist.id}>{playlist.title}</option>)}
          </select>
          <button className="button button-ghost button-small" type="button" onClick={addToPlaylist}>أضف للقائمة</button>
        </div>
      ) : null}
      {notice ? <small className="action-notice">{notice}</small> : null}
    </div>
  );
}
