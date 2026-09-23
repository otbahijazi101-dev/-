import type { MetadataRoute } from 'next';
import { getSiteName } from '@/lib/site-settings';

export const dynamic = 'force-dynamic';

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const siteName = await getSiteName();
  return {
    name: siteName,
    short_name: siteName.slice(0, 12),
    description: 'استمع وشاهد واحفظ الصوت للاستماع دون إنترنت.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#f2f2f2',
    theme_color: '#ff5500',
    lang: 'ar',
    dir: 'rtl',
    icons: [
      { src: '/api/branding/icon/192', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/api/branding/icon/512', sizes: '512x512', type: 'image/png', purpose: 'any' },
    ],
  };
}
