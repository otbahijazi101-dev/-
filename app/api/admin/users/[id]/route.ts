import { NextResponse } from 'next/server';
import { createAdminSupabaseClient, isSupabaseAdminConfigured } from '@/lib/supabase/admin';
import { createServerSupabaseClient } from '@/lib/supabase/server';

function adminRedirect(request: Request, state: string) {
  const url = new URL('/admin', request.url);
  url.searchParams.set('userAction', state);
  return NextResponse.redirect(url, { status: 303 });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL('/login', request.url), { status: 303 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, status')
    .eq('id', user.id)
    .maybeSingle();

  if (profile?.role !== 'admin' || profile?.status !== 'active') return new NextResponse('Forbidden', { status: 403 });
  if (!isSupabaseAdminConfigured) return adminRedirect(request, 'error');

  const formData = await request.formData();
  const action = String(formData.get('action') ?? '');
  if (action !== 'suspend' && action !== 'activate') return new NextResponse('Bad Request', { status: 400 });
  if (id === user.id && action === 'suspend') return adminRedirect(request, 'self');

  const admin = createAdminSupabaseClient();
  const { data: target, error: targetError } = await admin
    .from('profiles')
    .select('id, username, role, status')
    .eq('id', id)
    .maybeSingle();

  if (targetError || !target) return adminRedirect(request, 'missing');

  if (action === 'suspend') {
    if (target.role === 'admin' && target.status === 'active') {
      const { count } = await admin
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'admin')
        .eq('status', 'active');
      if ((count ?? 0) <= 1) return adminRedirect(request, 'last_admin');
    }

    const { error: banError } = await admin.auth.admin.updateUserById(id, { ban_duration: '876000h' });
    if (banError) return adminRedirect(request, 'error');

    const { error: statusError } = await admin.from('profiles').update({ status: 'suspended' }).eq('id', id);
    if (statusError) {
      await admin.auth.admin.updateUserById(id, { ban_duration: 'none' });
      return adminRedirect(request, 'error');
    }
    return adminRedirect(request, 'suspended');
  }

  const { error: statusError } = await admin.from('profiles').update({ status: 'active' }).eq('id', id);
  if (statusError) return adminRedirect(request, 'error');

  const { error: unbanError } = await admin.auth.admin.updateUserById(id, { ban_duration: 'none' });
  if (unbanError) {
    await admin.from('profiles').update({ status: 'suspended' }).eq('id', id);
    return adminRedirect(request, 'error');
  }

  return adminRedirect(request, 'activated');
}
