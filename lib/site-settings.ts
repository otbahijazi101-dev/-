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

export const getSiteLogoUrl = cache(async () => {
  if (!isSupabaseConfigured) return null;

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from('site_settings')
      .select('logo_path')
      .eq('id', 1)
      .maybeSingle();

    if (error || !data?.logo_path?.startsWith('logos/')) return null;
    return supabase.storage.from('branding').getPublicUrl(data.logo_path).data.publicUrl;
  } catch {
    return null;
  }
});
