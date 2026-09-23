import type { Metadata } from 'next';
import Link from 'next/link';
import { getSiteName } from '@/lib/site-settings';

export const metadata: Metadata = { title: 'تسجيل الدخول' };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; reset?: string }>;
}) {
  const { error, reset } = await searchParams;
  const siteName = await getSiteName();

  return (
    <section className="auth-section">
      <div className="auth-card">
        <span className="eyebrow eyebrow-dark">{siteName}</span>
        <h1>أهلًا بعودتك</h1>
        <p className="form-intro">ادخل باسم المستخدم وكلمة المرور. ويمكن لحساب الأدمن الحالي الدخول بالبريد الإلكتروني أيضًا.</p>
        {reset === '1' ? <div className="form-alert">تم تغيير كلمة المرور بنجاح. يمكنك الدخول الآن.</div> : null}
        {error ? <div className="form-alert">{error}</div> : null}
        <form className="stack-form" action="/api/auth/login" method="post">
          <label>
            <span>اسم المستخدم أو البريد الإلكتروني</span>
            <input name="username" autoComplete="username" required maxLength={120} />
          </label>
          <label>
            <span>كلمة المرور</span>
            <input name="password" type="password" autoComplete="current-password" required minLength={8} />
          </label>
          <button className="button button-dark button-wide" type="submit">دخول</button>
        </form>
        <p className="auth-switch">ليس لديك حساب؟ <Link href="/register">أنشئ حسابًا</Link></p>
        <p className="auth-switch">نسيت كلمة المرور؟ يمكنك <Link href="/register">إنشاء حساب جديد</Link>. ستبقى ملفاتك السابقة في حسابك القديم ولن تظهر في الحساب الجديد.</p>
      </div>
    </section>
  );
}
