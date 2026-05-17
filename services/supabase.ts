/**
 * Supabase client singleton para FitGO.
 * Lee credenciales de variables de entorno (definidas en .env o EAS secrets).
 */
import { createClient } from '@supabase/supabase-js';
import { SecureStorage } from '../utils/storage';

const supabaseUrl     = process.env.EXPO_PUBLIC_SUPABASE_URL     ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

if (__DEV__ && (!supabaseUrl || !supabaseAnonKey)) {
  console.warn(
    '[Supabase] ⚠️  Variables de entorno faltantes.\n' +
    'Crea un archivo .env en la raíz del proyecto con:\n' +
    '  EXPO_PUBLIC_SUPABASE_URL=...\n' +
    '  EXPO_PUBLIC_SUPABASE_ANON_KEY=...'
  );
}

// Usamos placeholders válidos en desarrollo para evitar crash en module init.
// La app mostrará un error de auth si las claves son inválidas, pero no crasheará.
export const supabase = createClient(
  supabaseUrl  || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      storage:          SecureStorage,
      autoRefreshToken: true,
      persistSession:   true,
      detectSessionInUrl: false,
      flowType: 'pkce',
    },
  }
);

