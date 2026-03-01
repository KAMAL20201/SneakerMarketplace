import { createClient } from "@supabase/supabase-js";

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);

// Normalise any stored image URL to use the current proxy/CDN domain.
// Handles rows saved before VITE_SUPABASE_URL was switched to the proxy.
const LEGACY_SUPABASE_ORIGIN = "https://vojwfupyoathhvujwaqh.supabase.co";
export function toStorageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (supabaseUrl && url.startsWith(LEGACY_SUPABASE_ORIGIN)) {
    return url.replace(LEGACY_SUPABASE_ORIGIN, supabaseUrl);
  }
  return url;
}
