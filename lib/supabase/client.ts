'use client';

import { createBrowserClient } from '@supabase/ssr';
import { supabasePublishableKey, supabaseUrl } from './config';

export function createBrowserSupabaseClient() {
  if (!supabaseUrl || !supabasePublishableKey) {
    throw new Error('Supabase is not configured.');
  }

  return createBrowserClient(supabaseUrl, supabasePublishableKey);
}
