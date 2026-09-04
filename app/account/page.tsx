import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'حسابي' };

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ password?: string; username?: string; error?: string }>;
}) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('username, role, status')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile) redirect('/');

  const { password, username, error } = await searchParams;
  const isAdmin = profile.role === 'admin' && profile.status === 'active';

  const errorText: Record<string, string> = {
    current_password: 'كلمة المرور الحالية غير صحيحة.',
    password_match: 'كلمتا المرور الجديدتان غير متطابقتين.',
    password_short: 'كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل.',
    username_invalid: 'اسم الحساب غير صالح.',
    username_taken: 'اسم الحساب مستخدم بالفعل.',
    forbidden: 'هذا الإجراء غير متاح لهذا الحساب.',
    update_failed: 'تعذر حفظ التعديل. حاول مرة أخرى.',
  };

  return (
    <section className="account-page">
      <div className="container account-shell">
        <div className="account-heading">
          <span className="section-kicker">الإعدادات</span>
          <h1>حسابي</h1>
          <p>إدارة بيانات الدخول الخاصة بك بأمان.</p>
        </div>

        {password === 'saved' ? <div className="form-alert form-success">تم تغيير كلمة المرور بنجاح.</div> : null}
        {username === 'saved' ? <div className="form-alert form-success">تم تغيير اسم الحساب بنجاح.</div> : null}
        {error ? <div className="form-alert">{errorText[error] ?? 'تعذر حفظ التعديل.'}</div> : null}

        <div className="account-grid">
          <article className="account-card">
            <div className="account-card-heading">
              <span>الأمان</span>
              <h2>تغيير كلمة المرور</h2>
              <p>اكتب كلمة المرور الحالية أولًا ثم اختر كلمة جديدة.</p>
            </div>

            <form className="stack-form account-form" action="/api/account/settings" method="post">
              <input type="hidden" name="action" value="password" />
              <label>
                كلمة المرور الحالية
                <input name="current_password" type="password" autoComplete="current-password" required />
              </label>
              <label>
                كلمة المرور الجديدة
                <input name="new_password" type="password" autoComplete="new-password" minLength={8} required />
                <small>8 أحرف على الأقل.</small>
              </label>
              <label>
                تأكيد كلمة المرور الجديدة
                <input name="confirm_password" type="password" autoComplete="new-password" minLength={8} required />
              </label>
              <div><button className="button button-dark" type="submit">حفظ كلمة المرور</button></div>
            </form>
          </article>

          <article className="account-card account-summary-card">
            <div className="account-card-heading">
              <span>الحساب</span>
              <h2>@{profile.username}</h2>
              <p>{isAdmin ? 'حساب إدارة الراديو' : 'حساب مستخدم'}</p>
            </div>

            {isAdmin ? (
              <form className="stack-form account-form" action="/api/account/settings" method="post">
                <input type="hidden" name="action" value="username" />
                <label>
                  اسم الحساب
                  <input name="username" defaultValue={profile.username} minLength={3} maxLength={30} required />
                  <small>سيظهر بهذا الشكل في الراديو ويُستخدم أيضًا عند تسجيل الدخول.</small>
                </label>
                <div><button className="button button-ghost" type="submit">تغيير اسم الحساب</button></div>
              </form>
            ) : (
              <div className="account-readonly-note">اسم الحساب ثابت للمستخدمين العاديين. يمكنك تغيير كلمة المرور من البطاقة المجاورة.</div>
            )}
          </article>
        </div>
      </div>
    </section>
  );
}
