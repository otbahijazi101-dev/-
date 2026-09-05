import type { Metadata, Viewport } from 'next';
import './globals.css';
import './features.css';
import './polish.css';
import './account-overrides.css';
import './media-row.css';
import './dark.css';
import './final.css';
import './mobile-nav.css';
import './review.css';
import './enhancements.css';
import './track-tap.css';
import './soundcloud.css';
import './mobile-polish.css';
import { SiteHeader } from '@/components/site-header';
import { RadioPlayer } from '@/components/radio-player';
import { TrackTapController } from '@/components/track-tap-controller';
import { PwaRegister } from '@/components/pwa-register';
import { getSiteName } from '@/lib/site-settings';

export const viewport: Viewport = {
  themeColor: '#ff5500',
  colorScheme: 'light',
};

export async function generateMetadata(): Promise<Metadata> {
  const siteName = await getSiteName();

  return {
    title: {
      default: siteName,
      template: `%s | ${siteName}`,
    },
    description: 'مساحة مفتوحة للاستماع والمشاهدة ومشاركة المحتوى بعد المراجعة.',
    manifest: '/manifest.webmanifest',
    icons: {
      icon: [
        { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
        { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      ],
      apple: [{ url: '/icon-192.png', sizes: '192x192', type: 'image/png' }],
    },
    appleWebApp: {
      capable: true,
      statusBarStyle: 'default',
      title: siteName,
    },
  };
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const siteName = await getSiteName();

  return (
    <html lang="ar" dir="rtl">
      <body>
        <PwaRegister />
        <TrackTapController />
        <SiteHeader />
        <main>{children}</main>
        <footer className="site-footer">
          <div className="container footer-inner">
            <span>{siteName}</span>
            <span>مساحة هادئة للصوت والصورة.</span>
          </div>
        </footer>
        <RadioPlayer />
      </body>
    </html>
  );
}
