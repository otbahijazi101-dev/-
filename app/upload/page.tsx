import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { UploadForm } from '@/components/upload-form';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'رفع ملف صوتي' };

export default async function UploadPage() {
  if (!isSupabaseConfigured) {
    return (
      <section className="auth-section">
        <div className="auth-card"><h1>رفع ملف صوتي</h1><div className="setup-note">نحتاج أولًا ربط مشروع Supabase الخاص بـ SoundPalestine.</div></div>
      </section>
    );
  }

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, status')
    .eq('id', user.id)
    .single();

  if (!profile || profile.status !== 'active') redirect('/login');
  const isAdmin = profile.role === 'admin';

  return (
    <section className="auth-section">
      <div className="auth-card auth-card-wide">
        <span className="eyebrow eyebrow-dark">UPLOAD</span>
        <h1>ارفع ملفًا صوتيًا</h1>
        <p className="form-intro">
          {isAdmin
            ? 'أنت أدمن: الملف الذي ترفعه سيظهر للعامة مباشرة.'
            : 'سيصل الملف إلى الإدارة للمراجعة، ولن يظهر للعامة إلا بعد اعتماده.'}
        </p>
        <UploadForm userId={user.id} isAdmin={isAdmin} />
      </div>
    </section>
  );
}
