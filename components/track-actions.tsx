'use client';

import { useEffect, useMemo, useState } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import type { RadioItem } from '@/components/radio-player';

type Playlist = { id: string; title: string };

export function TrackActions({
  item,
  userId,
  ownerId,
}: {
  item: RadioItem;
  userId?: string | null;
  ownerId?: string | null;
}) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [liked, setLiked] = useState(false);
  const [favorite, setFavorite] = useState(false);
  const [following, setFollowing] = useState(false);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [playlistId, setPlaylistId] = useState('');
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('radio-register', { detail: item }));
    return () => window.dispatchEvent(new CustomEvent('radio-unregister', { detail: { id: item.id } }));
  }, [item]);

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
    setNotice('أضيف إلى قائمة الانتظار.');
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
    setNotice('تم نسخ رابط المقطع.');
  }

  async function addToPlaylist() {
    if (!requireLogin() || !userId) return;
    if (!playlistId) {
      setNotice('أنشئ قائمة تشغيل أولًا.');
      return;
    }
    const { error } = await supabase.from('playlist_items').insert({ playlist_id: playlistId, track_id: item.id });
    setNotice(error?.code === '23505' ? 'المقطع موجود بالفعل في هذه القائمة.' : error ? 'تعذر الإضافة.' : 'أضيف إلى قائمة التشغيل.');
  }

  return (
    <div className="track-actions-wrap">
      <div className="track-actions-row">
        <button className="button button-dark button-small" type="button" onClick={play}>▶ تشغيل</button>
        <button className="button button-ghost button-small" type="button" onClick={queue}>+ قائمة الانتظار</button>
        <button className="button button-ghost button-small" type="button" onClick={toggleLike}>{liked ? '♥ أعجبني' : '♡ إعجاب'}</button>
        <button className="button button-ghost button-small" type="button" onClick={toggleFavorite}>{favorite ? '★ محفوظ' : '☆ حفظ'}</button>
        {ownerId && ownerId !== userId ? (
          <button className="button button-ghost button-small" type="button" onClick={toggleFollow}>{following ? 'متابَع ✓' : 'متابعة'}</button>
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
