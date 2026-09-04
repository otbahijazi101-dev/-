import Link from 'next/link';
import { PwaInstallButton } from '@/components/pwa-install-button';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getSiteName } from '@/lib/site-settings';

export async function SiteHeader() {
  const siteName = await getSiteName();
  let username: string | null = null;
  let isAdmin = false;

  if (isSupabaseConfigured) {
    try {
      const supabase = await createServerSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('username, role').eq('id', user.id).maybeSingle();
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
        <Link href="/" className="brand" aria-label={`${siteName} - الرئيسية`}>
          <span className="brand-name">{siteName}</span>
        </Link>

        <nav className="main-nav" aria-label="التنقل الرئيسي">
          <Link href="/">المكتبة</Link>
          <Link href="/search">بحث</Link>
          <Link href="/offline">تنزيلاتي</Link>
          {username ? <Link href="/following">أتابعهم</Link> : null}
          {username ? <Link href="/favorites">المحفوظات</Link> : null}
          {username ? <Link href="/playlists">قوائمي</Link> : null}
          {username ? <Link href="/upload">رفع</Link> : null}
          {username ? <Link href="/my-tracks">ملفاتي</Link> : null}
          {isAdmin ? <Link href="/admin">الإدارة</Link> : null}
        </nav>

        <form className="header-search" action="/search">
          <input name="q" placeholder="ابحث في الراديو" aria-label="بحث" />
        </form>

        <div className="header-actions">
          <PwaInstallButton />
          {username ? (
            <>
              <Link className="account-chip" href="/account">@{username}</Link>
              <form action="/api/auth/logout" method="post"><button className="button button-ghost button-small" type="submit">خروج</button></form>
            </>
          ) : (
            <><Link className="button button-ghost button-small" href="/login">دخول</Link><Link className="button button-dark button-small" href="/register">إنشاء حساب</Link></>
          )}
        </div>
      </div>
    </header>
  );
}
