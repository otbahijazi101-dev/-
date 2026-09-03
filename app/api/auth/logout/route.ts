import { NextResponse } from 'next/server';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  if (isSupabaseConfigured) {
    try {
      const supabase = await createServerSupabaseClient();
      await supabase.auth.signOut();
    } catch {
      // Redirect home even if the session was already invalid.
    }
  }

  return NextResponse.redirect(new URL('/', request.url), { status: 303 });
}
