import Link from 'next/link';
import { AudioCard } from '@/components/audio-card';
import { getSiteName } from '@/lib/site-settings';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { createServerSupabaseClient } from '@/lib/supabase/server';

type PublicTrackRow = {
  id: string;
  owner_id: string;
  slug: string | null;
  title: string;
  description: string | null;
  category: string | null;
  tags: string[] | null;
  cover_path: string | null;
  duration_seconds: number | null;
  waveform: number[] | null;
  storage_path: string;
  mime_type: string | null;
  published_at: string | null;
  owner: { username: string; display_name: string | null } | null;
};

type PublicTrack = PublicTrackRow & { mediaUrl: string | null; downloadUrl: string | null; coverUrl: string | null };

function downloadFileName(track: PublicTrackRow) {
  const extension = track.storage_path.split('.').pop() || 'media';
  const safeTitle = track.title.replace(/[\\/:*?"<>|]+/g, '-').trim() || 'media';
  return `${safeTitle}.${extension}`;
}

export default async function HomePage() {
  const siteName = await getSiteName();
  const siteMonogram = siteName.trim().slice(0, 2) || 'ر';
  let tracks: PublicTrack[] = [];
  let uploadHref = '/register';
  let userId: string | null = null;

  if (isSupabaseConfigured) {
    try {
      const supabase = await createServerSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id ?? null;
      uploadHref = user ? '/upload' : '/register';

      const { data } = await supabase
        .from('tracks')
        .select('id, owner_id, slug, title, description, category, tags, cover_path, duration_seconds, waveform, storage_path, mime_type, published_at, owner:profiles!tracks_owner_id_fkey(username, display_name)')
        .eq('status', 'published')
        .order('published_at', { ascending: false })
        .limit(30);

      const rows = (data ?? []) as unknown as PublicTrackRow[];
      tracks = await Promise.all(rows.map(async (track) => {
        const [{ data: signed }, { data: downloadSigned }, coverSigned] = await Promise.all([
          supabase.storage.from('audio').createSignedUrl(track.storage_path, 60 * 60),
          supabase.storage.from('audio').createSignedUrl(track.storage_path, 60 * 60, { download: downloadFileName(track) }),
          track.cover_path ? supabase.storage.from('covers').createSignedUrl(track.cover_path, 60 * 60) : Promise.resolve({ data: null }),
        ]);
        return {
          ...track,
          mediaUrl: signed?.signedUrl ?? null,
          downloadUrl: downloadSigned?.signedUrl ?? null,
          coverUrl: coverSigned.data?.signedUrl ?? null,
        };
      }));
    } catch {
      tracks = [];
    }
  }

  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-copy">
            <span className="eyebrow">{siteName}</span>
            <h1>كل صوت يستحق أن يُسمع.</h1>
            <p>استمع وشاهد المحتوى المنشور بحرية، أو أنشئ حسابًا وارفع صوتًا أو فيديو ليصل إلى الناس بعد مراجعة الإدارة.</p>
            <div className="hero-actions">
              <a className="button button-light" href="#latest">ابدأ الاستماع والمشاهدة</a>
              <Link className="button button-outline-light" href={uploadHref}>ارفع أول ملف</Link>
            </div>
            <form className="hero-search" action="/search">
              <input name="q" placeholder="ابحث عن عنوان أو ناشر أو وسم..." aria-label="البحث" />
              <button type="submit">بحث</button>
            </form>
          </div>
          <div className="hero-art" aria-hidden="true">
            <div className="hero-disc"><div className="hero-disc-center">{siteMonogram}</div></div>
            <div className="hero-wave">{Array.from({ length: 24 }).map((_, index) => <span key={index} style={{ height: `${15 + ((index * 29) % 78)}%` }} />)}</div>
          </div>
        </div>
      </section>

      <section className="section" id="latest">
        <div className="container">
          <div className="section-heading"><div><span className="section-kicker">المكتبة العامة</span><h2>أحدث المحتوى</h2></div><p>شغّل المحتوى، أضفه لقائمة الانتظار، احفظه أو شاركه من نفس البطاقة.</p></div>
          {!isSupabaseConfigured ? (
            <div className="empty-state"><strong>الواجهة جاهزة.</strong><p>سيظهر المحتوى هنا فور ربط مشروع Supabase الخاص بـ {siteName}.</p></div>
          ) : tracks.length === 0 ? (
            <div className="empty-state"><strong>لا توجد ملفات منشورة بعد.</strong><p>عند نشر أول ملف صوتي أو فيديو سيظهر هنا مباشرة.</p></div>
          ) : (
            <div className="audio-grid">
              {tracks.map((track) => (
                <AudioCard
                  key={track.id}
                  id={track.id}
                  ownerId={track.owner_id}
                  userId={userId}
                  slug={track.slug}
                  title={track.title}
                  description={track.description}
                  category={track.category}
                  tags={track.tags}
                  username={track.owner?.username}
                  displayName={track.owner?.display_name}
                  mediaUrl={track.mediaUrl}
                  downloadUrl={track.downloadUrl}
                  coverUrl={track.coverUrl}
                  mimeType={track.mime_type}
                  publishedAt={track.published_at}
                  durationSeconds={track.duration_seconds}
                  waveform={track.waveform}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="section section-muted">
        <div className="container three-steps">
          <div><span>01</span><h3>أنشئ حسابك</h3><p>اسم مستخدم وكلمة مرور فقط، ثم ادخل إلى مساحة الرفع.</p></div>
          <div><span>02</span><h3>ارفع المحتوى</h3><p>أضف العنوان والوصف والتصنيف والوسوم والغلاف ثم ارفع الملف.</p></div>
          <div><span>03</span><h3>بعد المراجعة يُنشر</h3><p>ملفات المستخدمين تنتظر اعتماد الإدارة، بينما يملك الأدمن صلاحية النشر المباشر.</p></div>
        </div>
      </section>
    </>
  );
}
