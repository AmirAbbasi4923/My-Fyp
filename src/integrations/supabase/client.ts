import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  // eslint-disable-next-line no-console
  console.error('Missing Supabase env vars: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
}

// Ensure each tab has a unique ID in dev mode
if (import.meta.env.DEV && !window.name) {
  window.name = 'tab_' + Math.random().toString(36).substring(2);
}

// Custom storage wrapper for Dev Mode: 
// Even if sessionStorage is copied (e.g. duplicating a tab), this forces 
// each tab to use a unique key based on its window.name.
// This guarantees true multi-role login in the same browser.
const devStorage = {
  getItem: (key: string) => {
    return sessionStorage.getItem(`${window.name}_${key}`);
  },
  setItem: (key: string, value: string) => {
    sessionStorage.setItem(`${window.name}_${key}`, value);
  },
  removeItem: (key: string) => {
    sessionStorage.removeItem(`${window.name}_${key}`);
  }
};

const authStorage = import.meta.env.DEV ? devStorage : localStorage;

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: authStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});