import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'تسجيل الدخول' };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <section className="auth-section">
      <div className="auth-card">
        <span className="eyebrow eyebrow-dark">SOUNDPALESTINE</span>
        <h1>أهلًا بعودتك</h1>
        <p className="form-intro">ادخل باسم المستخدم وكلمة المرور.</p>
        {error ? <div className="form-alert">{error}</div> : null}
        <form className="stack-form" action="/api/auth/login" method="post">
          <label>
            <span>اسم المستخدم</span>
            <input name="username" autoComplete="username" required minLength={3} maxLength={30} />
          </label>
          <label>
            <span>كلمة المرور</span>
            <input name="password" type="password" autoComplete="current-password" required minLength={8} />
          </label>
          <button className="button button-dark button-wide" type="submit">دخول</button>
        </form>
        <p className="auth-switch">ليس لديك حساب؟ <Link href="/register">أنشئ حسابًا</Link></p>
      </div>
    </section>
  );
}
