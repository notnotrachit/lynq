import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySessionJwt } from "@/lib/ethereum-auth";
import Navbar from "@/components/Navbar";
import SocialLinkingForm from "@/components/SocialLinkingForm";
import SocialLookup from "@/components/SocialLookup";
import NetworkBadge from "@/components/NetworkBadge";
import ClaimPendingFunds from "@/components/ClaimPendingFunds";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ success?: string; error?: string }>;
};

export default async function DashboardPage({ searchParams }: Props) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("session")?.value;

  if (!sessionToken) {
    redirect("/");
  }

  let walletAddress: string;
  try {
    const { payload } = await verifySessionJwt(sessionToken);
    walletAddress = payload.sub;
  } catch {
    redirect("/");
  }

  const params = await searchParams;
  const successMessage = params.success;
  const errorMessage = params.error;

  return (
    <div className="min-h-screen bg-[radial-gradient(1200px_600px_at_-10%_-20%,rgba(139,92,246,.08),transparent),radial-gradient(1200px_600px_at_110%_-20%,rgba(16,185,129,.08),transparent)] dark:bg-[radial-gradient(1200px_600px_at_-10%_-20%,rgba(139,92,246,.12),transparent),radial-gradient(1200px_600px_at_110%_-20%,rgba(16,185,129,.12),transparent)]">
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
        <div className="space-y-6">
          {/* Success/Error Messages */}
          {successMessage && (
            <section className="rounded-2xl border border-green-200 bg-green-50/70 p-4 shadow-sm ring-1 ring-green-500/10 backdrop-blur dark:border-green-900 dark:bg-green-950/30 dark:ring-green-500/20">
              <div className="flex items-center gap-2">
                <span className="text-xl">✅</span>
                <p className="text-sm text-green-900 dark:text-green-200">
                  {successMessage}
                </p>
              </div>
            </section>
          )}
          
          {errorMessage && (
            <section className="rounded-2xl border border-red-200 bg-red-50/70 p-4 shadow-sm ring-1 ring-red-500/10 backdrop-blur dark:border-red-900 dark:bg-red-950/30 dark:ring-red-500/20">
              <div className="flex items-center gap-2">
                <span className="text-xl">❌</span>
                <p className="text-sm text-red-900 dark:text-red-200">
                  {errorMessage}
                </p>
              </div>
            </section>
          )}

          <section className="rounded-2xl border border-zinc-200 bg-white/70 p-8 shadow-sm ring-1 ring-black/5 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/70 dark:ring-white/5">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
                  Dashboard
                </h1>
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                  Connected wallet: <code className="rounded bg-zinc-100 px-2 py-1 text-xs dark:bg-zinc-800">{walletAddress}</code>
                </p>
              </div>
              <NetworkBadge />
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white/70 p-8 shadow-sm ring-1 ring-black/5 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/70 dark:ring-white/5">
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
              Link Your Social Accounts
            </h2>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Connect your social media accounts to enable direct token transfers via your social handles.
            </p>
            <div className="mt-6">
              <SocialLinkingForm walletAddress={walletAddress} />
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white/70 p-8 shadow-sm ring-1 ring-black/5 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/70 dark:ring-white/5">
            <ClaimPendingFunds />
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white/70 p-8 shadow-sm ring-1 ring-black/5 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/70 dark:ring-white/5">
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
              Lookup Social Links
            </h2>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Search for social accounts linked to wallets or find wallets by social handles.
            </p>
            <div className="mt-6">
              <SocialLookup />
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
