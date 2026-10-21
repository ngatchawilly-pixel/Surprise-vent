import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Garde d'accès admin, appelée par le layout du panneau ET par chaque Server Action
 * (un layout ne protège pas les actions). Les politiques RLS restent la dernière barrière.
 */
export async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const { data: profile } = await supabase.from("profiles").select("role, full_name").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") redirect("/admin/login?erreur=acces");

  return { supabase, user, name: profile.full_name as string | null };
}
