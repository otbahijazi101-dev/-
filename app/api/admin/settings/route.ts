import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const formData = await request.formData();
  const siteName = String(formData.get('site_name') ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, 80);

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL('/login', request.url), { status: 303 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, status')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin' || profile?.status !== 'active') {
    return new NextResponse('Forbidden', { status: 403 });
  }

  if (!siteName) {
    return NextResponse.redirect(new URL('/admin?settings=invalid', request.url), { status: 303 });
  }

  const { error } = await supabase
    .from('site_settings')
    .update({ site_name: siteName, updated_at: new Date().toISOString() })
    .eq('id', 1);

  const target = error ? '/admin?settings=error' : '/admin?settings=saved';
  return NextResponse.redirect(new URL(target, request.url), { status: 303 });
}
