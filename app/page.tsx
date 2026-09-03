import Link from 'next/link';
import { AudioCard } from '@/components/audio-card';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { createServerSupabaseClient } from '@/lib/supabase/server';

type PublicTrackRow = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  storage_path: string;
  published_at: string | null;
  owner: { username: string; display_name: string | null } | null;
};

export default async function HomePage() {
  let tracks: Array<PublicTrackRow & { audioUrl: string | null }> = [];

  if (isSupabaseConfigured) {
    try {
      const supabase = await createServerSupabaseClient();
      const { data } = await supabase
        .from('tracks')
        .select('id, title, description, category, storage_path, published_at, owner:profiles!tracks_owner_id_fkey(username, display_name)')
        .eq('status', 'published')
        .order('published_at', { ascending: false })
        .limit(30);

      const rows = (data ?? []) as unknown as PublicTrackRow[];
      tracks = await Promise.all(
        rows.map(async (track) => {
          const { data: signed } = await supabase.storage
            .from('audio')
            .createSignedUrl(track.storage_path, 60 * 60);

          return { ...track, audioUrl: signed?.signedUrl ?? null };
        }),
      );
    } catch {
      tracks = [];
    }
  }

  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-copy">
            <span className="eyebrow">SOUNDPALESTINE</span>
            <h1>كل صوت يستحق أن يُسمع.</h1>
            <p>
              استمع بحرية إلى الملفات المنشورة، أو أنشئ حسابًا باسم مستخدم وكلمة مرور وارفع صوتك ليصل إلى الناس بعد مراجعة الإدارة.
            </p>
            <div className="hero-actions">
              <a className="button button-light" href="#latest">ابدأ الاستماع</a>
              <Link className="button button-outline-light" href="/register">ارفع أول ملف</Link>
            </div>
          </div>
          <div className="hero-art" aria-hidden="true">
            <div className="hero-disc">
              <div className="hero-disc-center">SP</div>
            </div>
            <div className="hero-wave">
              {Array.from({ length: 24 }).map((_, index) => (
                <span key={index} style={{ height: `${15 + ((index * 29) % 78)}%` }} />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="latest">
        <div className="container">
          <div className="section-heading">
            <div>
              <span className="section-kicker">المكتبة العامة</span>
              <h2>أحدث الأصوات</h2>
            </div>
            <p>كل ما وافقت عليه الإدارة يظهر هنا ويمكن لأي زائر تشغيله دون تسجيل.</p>
          </div>

          {!isSupabaseConfigured ? (
            <div className="empty-state">
              <strong>الواجهة جاهزة.</strong>
              <p>سيظهر المحتوى هنا فور ربط مشروع Supabase الخاص بـ SoundPalestine.</p>
            </div>
          ) : tracks.length === 0 ? (
            <div className="empty-state">
              <strong>لا توجد ملفات منشورة بعد.</strong>
              <p>عند نشر أول ملف صوتي سيظهر هنا مباشرة.</p>
            </div>
          ) : (
            <div className="audio-grid">
              {tracks.map((track) => (
                <AudioCard
                  key={track.id}
                  title={track.title}
                  description={track.description}
                  category={track.category}
                  username={track.owner?.username}
                  displayName={track.owner?.display_name}
                  audioUrl={track.audioUrl}
                  publishedAt={track.published_at}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="section section-muted">
        <div className="container three-steps">
          <div><span>01</span><h3>أنشئ حسابك</h3><p>اسم مستخدم وكلمة مرور فقط. لا نطلب منك بريدًا إلكترونيًا للدخول.</p></div>
          <div><span>02</span><h3>ارفع الملف</h3><p>أضف العنوان والوصف والتصنيف ثم ارفع الملف الصوتي.</p></div>
          <div><span>03</span><h3>بعد المراجعة يُنشر</h3><p>ملفات المستخدمين تنتظر اعتماد الإدارة، بينما يملك الأدمن صلاحية النشر المباشر.</p></div>
        </div>
      </section>
    </>
  );
}
