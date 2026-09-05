import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'راديو',
    short_name: 'راديو',
    description: 'استمع وشاهد واحفظ الصوت للاستماع دون إنترنت.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#f2f2f2',
    theme_color: '#ff5500',
    lang: 'ar',
    dir: 'rtl',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}
