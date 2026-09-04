import type { Metadata } from 'next';
import './globals.css';
import './features.css';
import './polish.css';
import { SiteHeader } from '@/components/site-header';
import { RadioPlayer } from '@/components/radio-player';
import { getSiteName } from '@/lib/site-settings';

export async function generateMetadata(): Promise<Metadata> {
  const siteName = await getSiteName();

  return {
    title: {
      default: siteName,
      template: `%s | ${siteName}`,
    },
    description: 'مساحة مفتوحة للاستماع والمشاهدة ومشاركة المحتوى بعد المراجعة.',
  };
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const siteName = await getSiteName();

  return (
    <html lang="ar" dir="rtl">
      <body>
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
