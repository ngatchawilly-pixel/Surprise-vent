import { addZone, saveSettings, saveZoneFees } from "@/actions/admin";
import { requireAdmin } from "@/lib/auth";
import { DEFAULT_SETTINGS } from "@/lib/data";
import { CITY_LABEL } from "@/lib/format";
import type { DeliveryZone, SiteSettings } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const { supabase } = await requireAdmin();
  const [{ data: rows }, { data: zones }] = await Promise.all([
    supabase.from("settings").select("key, value"),
    supabase.from("delivery_zones").select("*").order("city").order("sort_order"),
  ]);

  const s: SiteSettings = { ...DEFAULT_SETTINGS };
  for (const r of rows ?? []) (s as unknown as Record<string, unknown>)[r.key] = r.value;

  return (
    <div className="max-w-3xl space-y-8">
      <h1 className="text-3xl font-semibold">Réglages &amp; livraison</h1>

      <form action={saveSettings} className="card grid gap-4 p-6 sm:grid-cols-2">
        <h2 className="font-serif text-xl font-semibold sm:col-span-2">Informations du site</h2>
        <div><label htmlFor="whatsapp_number" className="label">Numéro WhatsApp (avec indicatif)</label><input id="whatsapp_number" name="whatsapp_number" inputMode="numeric" className="input" defaultValue={s.whatsapp_number} /></div>
        <div><label htmlFor="phone_display" className="label">Téléphone affiché</label><input id="phone_display" name="phone_display" className="input" defaultValue={s.phone_display} /></div>
        <div><label htmlFor="lead_days" className="label">Délai minimum de réservation (jours)</label><input id="lead_days" name="lead_days" type="number" min={0} className="input" defaultValue={s.lead_days} /></div>
        <div><label htmlFor="express_fee" className="label">Supplément express (FCFA)</label><input id="express_fee" name="express_fee" type="number" min={0} step={500} className="input" defaultValue={s.express_fee} /></div>
        <div className="sm:col-span-2"><label htmlFor="announcement" className="label">Bandeau d&apos;annonce</label><input id="announcement" name="announcement" className="input" defaultValue={s.announcement} /></div>
        <div><label htmlFor="address_yaounde" className="label">Adresse Yaoundé</label><input id="address_yaounde" name="address_yaounde" className="input" defaultValue={s.address_yaounde} /></div>
        <div><label htmlFor="address_douala" className="label">Adresse Douala</label><input id="address_douala" name="address_douala" className="input" defaultValue={s.address_douala} /></div>
        <div className="sm:col-span-2"><button className="btn btn-primary">Enregistrer les réglages</button></div>
      </form>

      <form action={saveZoneFees} className="card p-6">
        <h2 className="font-serif text-xl font-semibold">Frais de livraison par quartier</h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {((zones ?? []) as DeliveryZone[]).map((z) => (
            <li key={z.id} className="flex items-center justify-between gap-3 rounded-lg bg-surface-low px-3 py-2">
              <input type="hidden" name="zone_id" value={z.id} />
              <label htmlFor={`fee_${z.id}`} className="text-sm"><strong>{z.district}</strong> <span className="text-ink-soft">· {CITY_LABEL[z.city]}</span></label>
              <input id={`fee_${z.id}`} name={`fee_${z.id}`} type="number" min={0} step={500} defaultValue={z.fee} className="input !min-h-10 !w-28 text-right" />
            </li>
          ))}
        </ul>
        <button className="btn btn-primary mt-5">Enregistrer les frais</button>
      </form>

      <form action={addZone} className="card grid gap-4 p-6 sm:grid-cols-4">
        <h2 className="font-serif text-xl font-semibold sm:col-span-4">Ajouter un quartier</h2>
        <div><label htmlFor="city" className="label">Ville</label><select id="city" name="city" className="input"><option value="yaounde">Yaoundé</option><option value="douala">Douala</option></select></div>
        <div className="sm:col-span-2"><label htmlFor="district" className="label">Quartier</label><input id="district" name="district" required className="input" /></div>
        <div><label htmlFor="fee" className="label">Frais (FCFA)</label><input id="fee" name="fee" type="number" min={0} step={500} defaultValue={3000} className="input" /></div>
        <div className="sm:col-span-4"><button className="btn btn-outline">Ajouter</button></div>
      </form>
    </div>
  );
}
