import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { UploadForm } from '@/components/upload-form';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'تعديل الملف' };

export default async function EditTrackPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [{ data: track }, { data: profile }] = await Promise.all([
    supabase.from('tracks')
      .select('id, title, description, category, tags, storage_path, cover_path, mime_type')
      .eq('id', id).eq('owner_id', user.id).maybeSingle(),
    supabase.from('profiles').select('role, status').eq('id', user.id).maybeSingle(),
  ]);
  if (!track) notFound();
  if (profile?.status !== 'active') redirect('/my-tracks');

  return (
    <section className="auth-section">
      <div className="auth-card auth-card-wide">
        <h1>تعديل الملف</h1>
        <p className="form-intro">{profile.role === 'admin'
          ? 'عدّل العنوان أو اختر ملفًا بديلًا. سيُحفظ تعديلك مباشرة.'
          : 'عدّل العنوان أو اختر ملفًا بديلًا. عند الحفظ سيعود المحتوى للمراجعة، وإذا كان منشورًا سيتوقف ظهوره حتى الموافقة عليه.'}</p>
        <UploadForm userId={user.id} isAdmin={profile.role === 'admin'} editing={track} />
        <p className="auth-switch"><Link href="/my-tracks">العودة إلى ملفاتي</Link></p>
      </div>
    </section>
  );
}
