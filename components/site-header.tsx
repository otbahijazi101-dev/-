import Link from 'next/link';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function SiteHeader() {
  let username: string | null = null;
  let isAdmin = false;

  if (isSupabaseConfigured) {
    try {
      const supabase = await createServerSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('username, role')
          .eq('id', user.id)
          .maybeSingle();

        username = profile?.username ?? null;
        isAdmin = profile?.role === 'admin';
      }
    } catch {
      username = null;
    }
  }

  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link href="/" className="brand" aria-label="SoundPalestine - الرئيسية">
          <span className="brand-logo-placeholder" aria-hidden="true">LOGO</span>
          <span className="brand-name">SoundPalestine</span>
        </Link>

        <nav className="main-nav" aria-label="التنقل الرئيسي">
          <Link href="/">استمع</Link>
          {username ? <Link href="/upload">ارفع صوتًا</Link> : null}
          {username ? <Link href="/my-tracks">ملفاتي</Link> : null}
          {isAdmin ? <Link href="/admin">الإدارة</Link> : null}
        </nav>

        <div className="header-actions">
          {username ? (
            <>
              <span className="username-chip">@{username}</span>
              <form action="/api/auth/logout" method="post">
                <button className="button button-ghost button-small" type="submit">خروج</button>
              </form>
            </>
          ) : (
            <>
              <Link className="button button-ghost button-small" href="/login">دخول</Link>
              <Link className="button button-dark button-small" href="/register">إنشاء حساب</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
