import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'إنشاء حساب' };

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (isSupabaseConfigured) {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) redirect('/upload');
  }

  const { error } = await searchParams;

  return (
    <section className="auth-section">
      <div className="auth-card auth-card-wide">
        <span className="eyebrow eyebrow-dark">انضم إلى راديو</span>
        <h1>أنشئ حسابك</h1>
        <p className="form-intro">لن نطلب بريدًا إلكترونيًا. ستدخل دائمًا باسم المستخدم الذي تختاره.</p>
        {error ? <div className="form-alert">{error}</div> : null}
        <form className="stack-form" action="/api/auth/register" method="post">
          <label>
            <span>اسم العرض</span>
            <input name="displayName" maxLength={60} placeholder="الاسم الذي سيظهر للناس" />
          </label>
          <label>
            <span>اسم المستخدم</span>
            <input name="username" autoComplete="username" required minLength={3} maxLength={30} placeholder="مثال: صوت_القدس" />
            <small>يمكن استخدام الحروف العربية أو الإنجليزية والأرقام و . _ -</small>
          </label>
          <label>
            <span>كلمة المرور</span>
            <input name="password" type="password" autoComplete="new-password" required minLength={8} />
            <small>ثمانية أحرف على الأقل.</small>
          </label>
          <button className="button button-dark button-wide" type="submit">إنشاء الحساب</button>
        </form>
        <p className="auth-switch">لديك حساب بالفعل؟ <Link href="/login">سجّل الدخول</Link></p>
      </div>
    </section>
  );
}
