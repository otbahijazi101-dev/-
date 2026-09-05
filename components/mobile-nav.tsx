'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

type NavItem = {
  href: string;
  label: string;
  icon: 'home' | 'search' | 'download' | 'heart' | 'list' | 'users' | 'upload' | 'files' | 'account' | 'admin';
};

function Icon({ name }: { name: NavItem['icon'] }) {
  const common = {
    width: 23,
    height: 23,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.9,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };

  if (name === 'home') return <svg {...common}><path d="M3.5 10.5 12 3l8.5 7.5"/><path d="M5.5 9.5V21h13V9.5"/><path d="M9.5 21v-6h5v6"/></svg>;
  if (name === 'search') return <svg {...common}><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.5 4.5"/></svg>;
  if (name === 'download') return <svg {...common}><path d="M12 3v11"/><path d="m7.8 10.2 4.2 4.2 4.2-4.2"/><path d="M4 18.5V21h16v-2.5"/></svg>;
  if (name === 'heart') return <svg {...common}><path d="M20.8 5.9c-2.1-2.2-5.5-1.9-7.3.4L12 8.1l-1.5-1.8C8.7 4 5.3 3.7 3.2 5.9 1 8.3 1.4 12 3.8 14.1L12 21l8.2-6.9c2.4-2.1 2.8-5.8.6-8.2Z"/></svg>;
  if (name === 'list') return <svg {...common}><path d="M8 6h12M8 12h12M8 18h12"/><path d="M4 6h.01M4 12h.01M4 18h.01"/></svg>;
  if (name === 'users') return <svg {...common}><circle cx="9" cy="8" r="3"/><path d="M3.5 19c.5-3.1 2.4-5 5.5-5s5 1.9 5.5 5"/><path d="M16.2 5.5a3 3 0 0 1 0 5.8M17 14c2.3.3 3.6 1.9 4 4"/></svg>;
  if (name === 'upload') return <svg {...common}><path d="M12 21V8"/><path d="m7.8 11.8 4.2-4.2 4.2 4.2"/><path d="M4 5.5V3h16v2.5"/></svg>;
  if (name === 'files') return <svg {...common}><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h6"/></svg>;
  if (name === 'account') return <svg {...common}><circle cx="12" cy="8" r="3.5"/><path d="M5 21c.5-4.2 2.8-6.5 7-6.5s6.5 2.3 7 6.5"/></svg>;
  return <svg {...common}><path d="M4 21V8l8-5 8 5v13"/><path d="M8 21v-6h8v6"/><path d="M9 10h6"/></svg>;
}

function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MobileNav({ loggedIn, isAdmin }: { loggedIn: boolean; isAdmin: boolean }) {
  const pathname = usePathname();

  const items: NavItem[] = [
    { href: '/', label: 'المكتبة', icon: 'home' },
    { href: '/search', label: 'بحث', icon: 'search' },
    { href: '/offline', label: 'تنزيلاتي', icon: 'download' },
    ...(loggedIn ? [
      { href: '/favorites', label: 'المحفوظات', icon: 'heart' as const },
      { href: '/playlists', label: 'قوائمي', icon: 'list' as const },
      { href: '/following', label: 'أتابعهم', icon: 'users' as const },
      { href: '/upload', label: 'رفع', icon: 'upload' as const },
      { href: '/my-tracks', label: 'ملفاتي', icon: 'files' as const },
      { href: '/account', label: 'حسابي', icon: 'account' as const },
    ] : []),
    ...(isAdmin ? [{ href: '/admin', label: 'الإدارة', icon: 'admin' as const }] : []),
  ];

  return (
    <nav className="mobile-bottom-nav" aria-label="التنقل على الهاتف">
      <div className="mobile-bottom-nav-track">
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`mobile-bottom-nav-item${active ? ' is-active' : ''}`}
              aria-current={active ? 'page' : undefined}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
