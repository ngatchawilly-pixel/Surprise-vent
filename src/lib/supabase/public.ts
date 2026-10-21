import { createClient } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from "./env";

/**
 * Client anonyme sans cookies, pour les lectures publiques du catalogue.
 * Les réponses sont mises en cache 60 s par Next (ISR) ; les actions admin
 * invalident explicitement les pages concernées avec revalidatePath.
 */
export function createPublicClient() {
  if (!isSupabaseConfigured) return null;
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => fetch(input, { ...init, next: { revalidate: 60 } }),
    },
  });
}
