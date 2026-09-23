import { NextResponse } from 'next/server';
import { createAdminSupabaseClient, isSupabaseAdminConfigured } from '@/lib/supabase/admin';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const extensions: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

function back(request: Request, result: string) {
  return NextResponse.redirect(new URL(`/admin?logo=${result}`, request.url), { status: 303 });
}

function validImage(bytes: Uint8Array, mimeType: string) {
  if (mimeType === 'image/png') return bytes.length >= 8 && [137, 80, 78, 71, 13, 10, 26, 10].every((value, i) => bytes[i] === value);
  if (mimeType === 'image/jpeg') return bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if (mimeType === 'image/webp') return bytes.length >= 12 && String.fromCharCode(...bytes.subarray(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.subarray(8, 12)) === 'WEBP';
  return false;
}

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL('/login', request.url), { status: 303 });

  const { data: profile } = await supabase.from('profiles')
    .select('role, status').eq('id', user.id).maybeSingle();
  if (profile?.role !== 'admin' || profile.status !== 'active') return new NextResponse('Forbidden', { status: 403 });
  if (!isSupabaseAdminConfigured) return back(request, 'error');

  const form = await request.formData().catch(() => null);
  if (!form) return back(request, 'invalid');
  const removing = form.get('action') === 'remove';
  const file = form.get('logo');
  if (!removing && (!(file instanceof File) || !extensions[file.type] || file.size === 0 || file.size > MAX_LOGO_BYTES)) {
    return back(request, 'invalid');
  }

  const admin = createAdminSupabaseClient();
  const { data: previous, error: readError } = await admin.from('site_settings')
    .select('logo_path').eq('id', 1).single();
  if (readError || !previous) return back(request, 'error');

  let path: string | null = null;
  if (!removing && file instanceof File) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!validImage(bytes, file.type)) return back(request, 'invalid');
    path = `logos/${crypto.randomUUID()}.${extensions[file.type]}`;
    const { error } = await admin.storage.from('branding').upload(path, bytes, {
      contentType: file.type, cacheControl: '31536000', upsert: false,
    });
    if (error) return back(request, 'error');
  }

  const { data: updated, error: updateError } = await admin.from('site_settings')
    .update({ logo_path: path, updated_at: new Date().toISOString() })
    .eq('id', 1).select('id').single();
  if (updateError || !updated) {
    if (path) await admin.storage.from('branding').remove([path]);
    return back(request, 'error');
  }

  if (previous.logo_path?.startsWith('logos/') && previous.logo_path !== path) {
    await admin.storage.from('branding').remove([previous.logo_path]);
  }
  return back(request, removing ? 'removed' : 'saved');
}
