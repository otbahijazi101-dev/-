import 'server-only';

import { createClient } from '@supabase/supabase-js';
import { supabaseUrl } from './config';

const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

export const isSupabaseAdminConfigured = Boolean(
  supabaseUrl && supabaseServiceRoleKey,
);

export function createAdminSupabaseClient() {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error('Supabase admin credentials are not configured.');
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
