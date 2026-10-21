import type { Metadata } from "next";
import { LoginForm } from "@/components/admin/login-form";

export const metadata: Metadata = { title: "Connexion administrateur", robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ erreur?: string }> }) {
  const { erreur } = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center bg-surface-rose px-4">
      <div className="card w-full max-w-sm p-8">
        <p className="font-serif text-2xl font-bold text-primary">Surprise évent &amp; haid</p>
        <h1 className="mt-1 font-sans text-sm font-semibold uppercase tracking-wider text-ink-soft">Espace administrateur</h1>
        {erreur === "acces" && (
          <p role="alert" className="mt-4 rounded-lg bg-error-soft p-3 text-sm font-semibold text-danger">
            Ce compte n&apos;a pas les droits d&apos;administration.
          </p>
        )}
        <LoginForm />
      </div>
    </main>
  );
}
