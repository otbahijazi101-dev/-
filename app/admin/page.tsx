import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { VideoPreview } from '@/components/video-preview';
import { getSiteName } from '@/lib/site-settings';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'لوحة الإدارة' };

type AdminTrack = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  storage_path: string;
  mime_type: string | null;
  status: string;
  created_at: string;
  owner: { username: string; display_name: string | null } | null;
};

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ settings?: string }>;
}) {
  if (!isSupabaseConfigured) redirect('/login');

  const { settings } = await searchParams;
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, status')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin' || profile?.status !== 'active') redirect('/');

  const siteName = await getSiteName();

  const { data } = await supabase
    .from('tracks')
    .select('id, title, description, category, storage_path, mime_type, status, created_at, owner:profiles!tracks_owner_id_fkey(username, display_name)')
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  const rows = (data ?? []) as unknown as AdminTrack[];
  const tracks = await Promise.all(rows.map(async (track) => {
    const { data: signed } = await supabase.storage.from('audio').createSignedUrl(track.storage_path, 3600);
    return { ...track, mediaUrl: signed?.signedUrl ?? null };
  }));

  return (
    <section className="dashboard">
      <div className="container">
        <div className="dashboard-heading">
          <div><h1>لوحة الإدارة</h1><p>إدارة اسم المنصة ومراجعة الملفات الصوتية والفيديو.</p></div>
          <Link className="button button-dark" href="/upload">رفع كأدمن</Link>
        </div>

        <div className="panel settings-panel">
          <div className="admin-card">
            <div className="admin-card-top">
              <div>
                <h3>اسم المنصة</h3>
                <p className="creator-name">غيّر الاسم هنا وسيظهر تلقائيًا في واجهة الراديو وعنوان المتصفح.</p>
              </div>
            </div>

            {settings === 'saved' ? <div className="form-alert form-success">تم حفظ اسم المنصة.</div> : null}
            {settings === 'invalid' ? <div className="form-alert">اكتب اسمًا صالحًا للمنصة.</div> : null}
            {settings === 'error' ? <div className="form-alert">تعذر حفظ الاسم. حاول مرة أخرى.</div> : null}

            <form className="stack-form settings-form" action="/api/admin/settings" method="post">
              <label>
                اسم الراديو
                <input name="site_name" defaultValue={siteName} maxLength={80} required />
                <small>الاسم الحالي: {siteName}</small>
              </label>
              <div>
                <button className="button button-dark button-small" type="submit">حفظ الاسم</button>
              </div>
            </form>
          </div>
        </div>

        <div className="dashboard-heading dashboard-heading-compact">
          <div><h2>مراجعة الملفات</h2><p>{tracks.length} ملفًا بانتظار قرار الإدارة.</p></div>
        </div>

        <div className="panel">
          {tracks.length === 0 ? (
            <div className="empty-state"><strong>لا توجد ملفات تنتظر المراجعة.</strong><p>كل شيء محدث حاليًا.</p></div>
          ) : tracks.map((track) => {
            const isVideo = Boolean(track.mime_type?.startsWith('video/'));
            return (
              <article className="admin-card" key={track.id}>
                <div className="admin-card-top">
                  <div>
                    <h3>{track.title}</h3>
                    <p className="creator-name">{track.owner?.display_name || track.owner?.username} @{track.owner?.username}</p>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span className="tag">{isVideo ? 'فيديو' : 'صوت'}</span>
                    {track.category ? <span className="tag">{track.category}</span> : null}
                  </div>
                </div>
                {track.description ? <p className="audio-description">{track.description}</p> : null}
                {track.mediaUrl ? (
                  isVideo ? (
                    <div style={{ margin: '16px 0', maxWidth: 820 }}>
                      <VideoPreview src={track.mediaUrl} title={track.title} />
                    </div>
                  ) : (
                    <audio controls preload="none" src={track.mediaUrl} />
                  )
                ) : <div className="form-alert">تعذر إنشاء رابط معاينة مؤقت.</div>}
                <form className="admin-actions" action={`/api/admin/tracks/${track.id}`} method="post">
                  <input name="reason" placeholder="سبب الرفض عند الحاجة" maxLength={300} />
                  <button className="button button-dark button-small" name="action" value="publish" type="submit">اعتماد ونشر</button>
                  <button className="button button-ghost button-small" name="action" value="reject" type="submit">رفض</button>
                  <button className="button button-danger button-small" name="action" value="delete" type="submit">حذف</button>
                </form>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
