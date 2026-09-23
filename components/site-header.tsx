import Link from 'next/link';
import Image from 'next/image';
import { PwaInstallButton } from '@/components/pwa-install-button';
import { MobileNav } from '@/components/mobile-nav';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getSiteLogoUrl, getSiteName } from '@/lib/site-settings';

export async function SiteHeader() {
  const [siteName, logoUrl] = await Promise.all([getSiteName(), getSiteLogoUrl()]);
  let username: string | null = null;
  let isAdmin = false;

  if (isSupabaseConfigured) {
    try {
      const supabase = await createServerSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('username, role, status').eq('id', user.id).maybeSingle();
        if (profile?.status === 'active') {
          username = profile.username ?? null;
          isAdmin = profile.role === 'admin';
        }
      }
    } catch {
      username = null;
    }
  }

  return (
    <>
      <header className="site-header">
        <div className="container header-inner">
          <Link href="/" className="brand" aria-label={`${siteName} - الرئيسية`}>
            {logoUrl ? <Image className="brand-logo" src={logoUrl} alt="" width={38} height={38} unoptimized /> : null}
            <span className="brand-name">{siteName}</span>
          </Link>
          <nav className="main-nav" aria-label="التنقل الرئيسي">
            <Link href="/">المكتبة</Link>
            <Link href="/recent">مؤخرًا</Link>
            <Link href="/search">بحث</Link>
            <Link href="/community-playlists">قوائم المجتمع</Link>
            <Link href="/offline">تنزيلاتي</Link>
            {username ? <Link href="/following">أتابعهم</Link> : null}
            {username ? <Link href="/favorites">المحفوظات</Link> : null}
            {username ? <Link href="/playlists">قوائمي</Link> : null}
            {username ? <Link href="/upload">رفع</Link> : null}
            {username ? <Link href="/my-tracks">ملفاتي</Link> : null}
            {isAdmin ? <Link href="/admin">الإدارة</Link> : null}
          </nav>
          <form className="header-search" action="/search"><input name="q" placeholder="ابحث في المكتبة" aria-label="بحث" /></form>
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
      <MobileNav loggedIn={Boolean(username)} isAdmin={isAdmin} />
    </>
  );
}
