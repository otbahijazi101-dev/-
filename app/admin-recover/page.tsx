import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'استعادة حساب الإدارة',
  robots: { index: false, follow: false },
};

export default async function AdminRecoverPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const { token = '', error } = await searchParams;

  return (
    <section className="auth-section">
      <div className="auth-card auth-card-wide">
        <span className="eyebrow eyebrow-dark">استعادة حساب الإدارة</span>
        <h1>عيّن كلمة مرور جديدة</h1>
        <p className="form-intro">هذا الرابط مؤقت ومخصص لحساب الأدمن فقط.</p>
        {error ? <div className="form-alert">{error}</div> : null}
        <form className="stack-form" action="/api/auth/admin-recover" method="post">
          <input type="hidden" name="token" value={token} />
          <label>
            <span>كلمة المرور الجديدة</span>
            <input name="password" type="password" autoComplete="new-password" required minLength={10} />
            <small>10 أحرف على الأقل.</small>
          </label>
          <label>
            <span>تأكيد كلمة المرور</span>
            <input name="confirmPassword" type="password" autoComplete="new-password" required minLength={10} />
          </label>
          <button className="button button-dark button-wide" type="submit">تغيير كلمة المرور</button>
        </form>
      </div>
    </section>
  );
}
