import { createElement } from 'react';
import { ImageResponse } from 'next/og';
import { getSiteLogoUrl } from '@/lib/site-settings';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: Promise<{ size: string }> }) {
  const { size: requestedSize } = await params;
  const size = Number(requestedSize);
  if (![180, 192, 512].includes(size)) return new Response('Not found', { status: 404 });

  let logoData: string | null = null;
  const logoUrl = await getSiteLogoUrl();
  if (logoUrl) {
    try {
      const response = await fetch(logoUrl, { cache: 'no-store' });
      const mime = response.headers.get('content-type')?.split(';')[0];
      if (response.ok && mime && ['image/png', 'image/jpeg', 'image/webp'].includes(mime)) {
        const bytes = await response.arrayBuffer();
        if (bytes.byteLength > 0 && bytes.byteLength <= 2 * 1024 * 1024) {
          logoData = `data:${mime};base64,${Buffer.from(bytes).toString('base64')}`;
        }
      }
    } catch { /* Show the default icon when the uploaded image is unavailable. */ }
  }

  return new ImageResponse(
    createElement('div', {
      style: {
        width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#ff5500', borderRadius: size * 0.18,
      },
    }, logoData
      ? createElement('img', { src: logoData, width: Math.round(size * 0.76), height: Math.round(size * 0.76), style: { objectFit: 'contain' } })
      : createElement('span', { style: { fontSize: size * 0.63, color: '#fff' } }, '♫')),
    { width: size, height: size, headers: { 'Cache-Control': 'public, max-age=300' } },
  );
}
