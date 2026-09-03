import { cache } from 'react';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const DEFAULT_SITE_NAME = 'راديو';

export const getSiteName = cache(async () => {
  if (!isSupabaseConfigured) return DEFAULT_SITE_NAME;

  try {
    const supabase = await createServerSupabaseClient();
    const { data } = await supabase
      .from('site_settings')
      .select('site_name')
      .eq('id', 1)
      .maybeSingle();

    const value = data?.site_name?.trim();
    return value || DEFAULT_SITE_NAME;
  } catch {
    return DEFAULT_SITE_NAME;
  }
});
