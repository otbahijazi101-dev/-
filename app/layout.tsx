import type { Metadata } from 'next';
import './globals.css';
import { SiteHeader } from '@/components/site-header';

export const metadata: Metadata = {
  title: {
    default: 'SoundPalestine',
    template: '%s | SoundPalestine',
  },
  description: 'مساحة مفتوحة للاستماع إلى المحتوى الصوتي ومشاركته بعد المراجعة.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        <SiteHeader />
        <main>{children}</main>
        <footer className="site-footer">
          <div className="container footer-inner">
            <span>SoundPalestine</span>
            <span>مساحة للصوت، مفتوحة للجميع.</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
