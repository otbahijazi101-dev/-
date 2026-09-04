import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { VideoPreview } from '@/components/video-preview';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'ملفاتي' };

const statusText: Record<string, string> = {
  pending: 'بانتظار المراجعة',
  published: 'منشور',
  rejected: 'مرفوض',
};

export default async function MyTracksPage({
  searchParams,
}: {
  searchParams: Promise<{ uploaded?: string }>;
}) {
  if (!isSupabaseConfigured) redirect('/login');

  const { uploaded } = await searchParams;
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data } = await supabase
    .from('tracks')
    .select('id, title, description, status, rejection_reason, created_at, storage_path, mime_type')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false });

  const tracks = await Promise.all((data ?? []).map(async (track) => {
    const { data: signed } = await supabase.storage.from('audio').createSignedUrl(track.storage_path, 3600);
    return { ...track, mediaUrl: signed?.signedUrl ?? null };
  }));

  return (
    <section className="dashboard">
      <div className="container">
        <div className="dashboard-heading">
          <div><h1>ملفاتي</h1><p>تابع حالة كل صوت أو فيديو رفعته إلى الراديو.</p></div>
          <Link className="button button-dark" href="/upload">ارفع ملفًا جديدًا</Link>
        </div>
        {uploaded ? <div className="form-alert form-success">تم رفع الملف بنجاح.</div> : null}
        <div className="panel">
          {tracks.length === 0 ? (
            <div className="empty-state"><strong>لم ترفع أي ملفات بعد.</strong><p>ابدأ برفع أول صوت أو فيديو.</p></div>
          ) : (
            <div className="track-list">
              {tracks.map((track) => {
                const isVideo = Boolean(track.mime_type?.startsWith('video/'));
                return (
                  <div className="track-row" key={track.id}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <h3 style={{ margin: 0 }}>{track.title}</h3>
                        <span className="tag">{isVideo ? 'فيديو' : 'صوت'}</span>
                      </div>
                      <p>{track.description || 'بدون وصف'}</p>
                      {track.status === 'rejected' && track.rejection_reason ? <p>سبب الرفض: {track.rejection_reason}</p> : null}
                      {track.mediaUrl ? (
                        isVideo ? (
                          <div style={{ width: '100%', maxWidth: 760, marginTop: 12 }}>
                            <VideoPreview src={track.mediaUrl} title={track.title} />
                          </div>
                        ) : (
                          <audio className="audio-player" controls preload="none" src={track.mediaUrl} />
                        )
                      ) : null}
                    </div>
                    <span className={`status status-${track.status}`}>{statusText[track.status] ?? track.status}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
