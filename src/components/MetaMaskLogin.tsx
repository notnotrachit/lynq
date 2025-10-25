"use client";

import React, { useCallback, useState } from "react";
import { useAccount, useConnect, useDisconnect, useSignMessage } from "wagmi";
import { injected } from "wagmi/connectors";

type Props = {
  className?: string;
  buttonLabel?: string;
  statement?: string;
  onAuthenticatedAction?: (address: string) => void;
  onErrorAction?: (error: Error) => void;
};

function shortAddress(addr: string, chars = 4) {
  if (addr.length <= chars * 2 + 3) return addr;
  return `${addr.slice(0, chars)}…${addr.slice(-chars)}`;
}

export default function MetaMaskLogin({
  className,
  buttonLabel = "Sign in with MetaMask",
  statement = "Please sign this message to authenticate with the application.",
  onAuthenticatedAction,
  onErrorAction,
}: Props) {
  const { address, isConnected } = useAccount();
  const { connect, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { signMessageAsync } = useSignMessage();

  const [signing, setSigning] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearErrors = () => setError(null);

  const fetchNonceAndMessage = useCallback(
    async (addr: string): Promise<{ nonce: string; message: string }> => {
      const params = new URLSearchParams({
        address: addr,
        statement,
      });
      const res = await fetch(`/api/auth/nonce?${params.toString()}`, {
        method: "GET",
        credentials: "include",
        headers: {
          "content-type": "application/json",
        },
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Failed to fetch nonce: ${res.status} ${text}`);
      }
      const data = (await res.json()) as {
        nonce: string;
        message?: string;
        address?: string;
      };
      if (!data?.nonce) throw new Error("Server did not return a login nonce.");
      if (!data?.message)
        throw new Error("Server did not return a sign-in message.");
      return { nonce: data.nonce, message: data.message };
    },
    [statement],
  );

  const verifySignature = useCallback(
    async (
      addr: string,
      signature: string,
      message: string,
    ): Promise<void> => {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        credentials: "include",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          address: addr,
          signature,
          message,
        }),
      });
      if (!res.ok) {
        let data: unknown = null;
        try {
          data = await res.json();
        } catch {
          // ignore parse errors
        }
        const msg =
          (data as { error?: string } | null)?.error ||
          `Verification failed (${res.status})`;
        throw new Error(msg);
      }
    },
    [],
  );

  const handleSignIn = useCallback(async () => {
    clearErrors();
    try {
      // Connect wallet if not connected
      if (!isConnected || !address) {
        connect({ connector: injected() });
        return; // Will retry after connection
      }

      setSigning(true);
      const { message } = await fetchNonceAndMessage(address);
      const signature = await signMessageAsync({ message });
      setSigning(false);

      setVerifying(true);
      await verifySignature(address, signature, message);
      setVerifying(false);

      if (onAuthenticatedAction) {
        onAuthenticatedAction(address);
      } else {
        window.location.assign("/dashboard");
      }
    } catch (e: unknown) {
      setSigning(false);
      setVerifying(false);
      const err = e instanceof Error ? e : new Error(String(e));
      setError(err.message || "Authentication failed");
      onErrorAction?.(err);
    }
  }, [
    address,
    isConnected,
    connect,
    fetchNonceAndMessage,
    onAuthenticatedAction,
    onErrorAction,
    signMessageAsync,
    verifySignature,
  ]);

  const handleDisconnect = useCallback(async () => {
    clearErrors();
    try {
      disconnect();
    } catch {
      // ignore disconnect errors
    }
  }, [disconnect]);

  const busy = isConnecting || signing || verifying;

  // Auto-sign when wallet connects
  React.useEffect(() => {
    if (isConnected && address && !signing && !verifying) {
      // Small delay to ensure connection is stable
      const timer = setTimeout(() => {
        handleSignIn();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isConnected, address]);

  return (
    <div className={className}>
      <div className="w-full space-y-3">
        <div className="w-full">
          <button
            disabled={busy}
            onClick={handleSignIn}
            className={`inline-flex w-full items-center justify-center rounded-xl ${
              busy
                ? "bg-zinc-400 dark:bg-zinc-700"
                : "bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700"
            } px-5 py-3 text-white shadow-lg ring-1 ring-orange-500/30 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 disabled:cursor-not-allowed`}
            title="Connect your wallet"
          >
            {busy ? (
              <span
                className="inline-flex items-center gap-2"
                aria-live="polite"
              >
                <Spinner />
                {isConnecting
                  ? "Connecting…"
                  : signing
                    ? "Signing…"
                    : verifying
                      ? "Verifying…"
                      : "Working…"}
              </span>
            ) : (
              <span className="inline-flex items-center gap-2">
                <MetaMaskIcon />
                {buttonLabel}
              </span>
            )}
          </button>
        </div>

        {error ? (
          <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
            {error}
          </div>
        ) : null}

        {isConnected && address && (
          <div className="flex items-center justify-between text-sm text-zinc-600 dark:text-zinc-400">
            <span>Connected: {shortAddress(address)}</span>
            <button
              onClick={handleDisconnect}
              className="text-orange-600 hover:text-orange-700 dark:text-orange-400"
            >
              Disconnect
            </button>
          </div>
        )}

        <p className="text-xs text-zinc-500 text-center">
          By clicking "{buttonLabel}", you will connect your wallet, sign a
          message, and we'll verify it on the server before granting access.
        </p>
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin text-white"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  );
}

function MetaMaskIcon() {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M36.5 3.5L22.5 13.5L25 8L36.5 3.5Z"
        fill="#E17726"
        stroke="#E17726"
        strokeWidth="0.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3.5 3.5L17.3 13.6L15 8L3.5 3.5Z"
        fill="#E27625"
        stroke="#E27625"
        strokeWidth="0.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M31.5 27.5L28 33L35.5 35L37.5 27.6L31.5 27.5Z"
        fill="#E27625"
        stroke="#E27625"
        strokeWidth="0.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M2.5 27.6L4.5 35L12 33L8.5 27.5L2.5 27.6Z"
        fill="#E27625"
        stroke="#E27625"
        strokeWidth="0.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M11.5 17.5L9.5 20.5L17 20.8L16.7 12.5L11.5 17.5Z"
        fill="#E27625"
        stroke="#E27625"
        strokeWidth="0.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M28.5 17.5L23.2 12.4L23 20.8L30.5 20.5L28.5 17.5Z"
        fill="#E27625"
        stroke="#E27625"
        strokeWidth="0.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 33L16.5 30.8L12.7 27.6L12 33Z"
        fill="#E27625"
        stroke="#E27625"
        strokeWidth="0.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M23.5 30.8L28 33L27.3 27.6L23.5 30.8Z"
        fill="#E27625"
        stroke="#E27625"
        strokeWidth="0.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
