"use client";

import { useState, useEffect } from "react";

type SocialLinks = {
  twitter: string | null;
  instagram: string | null;
  linkedin: string | null;
};

type Props = {
  walletAddress: string;
};

export default function SocialLinkingForm({ walletAddress }: Props) {
  const [socials, setSocials] = useState<SocialLinks | null>(null);
  const [loading, setLoading] = useState(true);
  const [linking, setLinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [twitterHandle, setTwitterHandle] = useState("");
  const [instagramHandle, setInstagramHandle] = useState("");
  const [linkedinHandle, setLinkedinHandle] = useState("");

  useEffect(() => {
    fetchSocialLinks();
  }, [walletAddress]);

  const fetchSocialLinks = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/social/get?wallet=${walletAddress}`);
      const data = await res.json();

      if (data.linked && data.socials) {
        setSocials(data.socials);
        setTwitterHandle(data.socials.twitter || "");
        setInstagramHandle(data.socials.instagram || "");
        setLinkedinHandle(data.socials.linkedin || "");
      }
    } catch (err) {
      console.error("Failed to fetch social links:", err);
    } finally {
      setLoading(false);
    }
  };

  const linkTwitterOAuth = () => {
    // Redirect to Twitter OAuth flow
    window.location.href = "/api/oauth/twitter/authorize";
  };

  const linkSocial = async (platform: "instagram" | "linkedin", handle: string) => {
    if (!handle.trim()) {
      setError(`Please enter a ${platform} handle`);
      return;
    }

    try {
      setLinking(true);
      setError(null);
      setSuccess(null);

      const res = await fetch("/api/social/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, handle }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to link account");
      }

      setSuccess(`${platform} account linked successfully!`);
      await fetchSocialLinks();
    } catch (err: any) {
      setError(err.message || "Failed to link account");
    } finally {
      setLinking(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-green-300 bg-green-50 p-4 text-sm text-green-900 dark:border-green-800 dark:bg-green-950 dark:text-green-200">
          {success}
        </div>
      )}

      {/* Twitter - OAuth */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Twitter Account
        </label>
        {socials?.twitter ? (
          <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 px-4 py-3 dark:border-green-900 dark:bg-green-950">
            <div className="flex items-center gap-2">
              <span className="text-green-600 dark:text-green-400">✓</span>
              <span className="text-sm font-medium text-green-900 dark:text-green-200">
                @{socials.twitter}
              </span>
            </div>
            <button
              onClick={linkTwitterOAuth}
              disabled={linking}
              className="rounded-lg bg-violet-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-violet-700 disabled:bg-zinc-400 dark:disabled:bg-zinc-700"
            >
              Update
            </button>
          </div>
        ) : (
          <button
            onClick={linkTwitterOAuth}
            disabled={linking}
            className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm font-medium text-zinc-900 hover:bg-zinc-50 disabled:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700 dark:disabled:bg-zinc-800"
          >
            <div className="flex items-center justify-center gap-2">
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
              Connect Twitter Account
            </div>
          </button>
        )}
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          🔒 Verify ownership via Twitter OAuth
        </p>
      </div>

      {/* Instagram */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Instagram Handle
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={instagramHandle}
            onChange={(e) => setInstagramHandle(e.target.value)}
            placeholder="@username"
            className="flex-1 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500"
          />
          <button
            onClick={() => linkSocial("instagram", instagramHandle)}
            disabled={linking}
            className="rounded-lg bg-violet-600 px-6 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:bg-zinc-400 dark:disabled:bg-zinc-700"
          >
            {socials?.instagram ? "Update" : "Link"}
          </button>
        </div>
        {socials?.instagram && (
          <p className="text-xs text-green-600 dark:text-green-400">
            ✓ Linked: {socials.instagram}
          </p>
        )}
      </div>

      {/* LinkedIn */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          LinkedIn Handle
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={linkedinHandle}
            onChange={(e) => setLinkedinHandle(e.target.value)}
            placeholder="username"
            className="flex-1 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500"
          />
          <button
            onClick={() => linkSocial("linkedin", linkedinHandle)}
            disabled={linking}
            className="rounded-lg bg-violet-600 px-6 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:bg-zinc-400 dark:disabled:bg-zinc-700"
          >
            {socials?.linkedin ? "Update" : "Link"}
          </button>
        </div>
        {socials?.linkedin && (
          <p className="text-xs text-green-600 dark:text-green-400">
            ✓ Linked: {socials.linkedin}
          </p>
        )}
      </div>

      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-200">
        <p className="font-medium">How it works:</p>
        <ul className="mt-2 list-inside list-disc space-y-1 text-xs">
          <li>Link your social accounts to your Ethereum wallet</li>
          <li>Others can send you PYUSD using your social handle</li>
          <li>Your Chrome extension will show a payment button on linked profiles</li>
        </ul>
      </div>
    </div>
  );
}
