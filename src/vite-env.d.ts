/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_WHATSAPP_BUSINESS_NUMBER: string;
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_UPI_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
