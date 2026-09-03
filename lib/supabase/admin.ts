import 'server-only';

import { createClient } from '@supabase/supabase-js';
import { supabaseUrl } from './config';

const supabaseAdminKey =
  process.env.SUPABASE_SECRET_KEY ??
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  '';

export const isSupabaseAdminConfigured = Boolean(
  supabaseUrl && supabaseAdminKey,
);

export function createAdminSupabaseClient() {
  if (!supabaseUrl || !supabaseAdminKey) {
    throw new Error('Supabase admin credentials are not configured.');
  }

  return createClient(supabaseUrl, supabaseAdminKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
