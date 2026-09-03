import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'لوحة الإدارة' };

type AdminTrack = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  storage_path: string;
  status: string;
  created_at: string;
  owner: { username: string; display_name: string | null } | null;
};

export default async function AdminPage() {
  if (!isSupabaseConfigured) redirect('/login');

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') redirect('/');

  const { data } = await supabase
    .from('tracks')
    .select('id, title, description, category, storage_path, status, created_at, owner:profiles!tracks_owner_id_fkey(username, display_name)')
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  const rows = (data ?? []) as unknown as AdminTrack[];
  const tracks = await Promise.all(rows.map(async (track) => {
    const { data: signed } = await supabase.storage.from('audio').createSignedUrl(track.storage_path, 3600);
    return { ...track, audioUrl: signed?.signedUrl ?? null };
  }));

  return (
    <section className="dashboard">
      <div className="container">
        <div className="dashboard-heading">
          <div><h1>مراجعة الملفات</h1><p>{tracks.length} ملفًا بانتظار قرار الإدارة.</p></div>
          <Link className="button button-dark" href="/upload">رفع كأدمن</Link>
        </div>
        <div className="panel">
          {tracks.length === 0 ? (
            <div className="empty-state"><strong>لا توجد ملفات تنتظر المراجعة.</strong><p>كل شيء محدث حاليًا.</p></div>
          ) : tracks.map((track) => (
            <article className="admin-card" key={track.id}>
              <div className="admin-card-top">
                <div>
                  <h3>{track.title}</h3>
                  <p className="creator-name">{track.owner?.display_name || track.owner?.username} @{track.owner?.username}</p>
                </div>
                {track.category ? <span className="tag">{track.category}</span> : null}
              </div>
              {track.description ? <p className="audio-description">{track.description}</p> : null}
              {track.audioUrl ? <audio controls preload="none" src={track.audioUrl} /> : <div className="form-alert">تعذر إنشاء رابط استماع مؤقت.</div>}
              <form className="admin-actions" action={`/api/admin/tracks/${track.id}`} method="post">
                <input name="reason" placeholder="سبب الرفض عند الحاجة" maxLength={300} />
                <button className="button button-dark button-small" name="action" value="publish" type="submit">اعتماد ونشر</button>
                <button className="button button-ghost button-small" name="action" value="reject" type="submit">رفض</button>
                <button className="button button-danger button-small" name="action" value="delete" type="submit">حذف</button>
              </form>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
