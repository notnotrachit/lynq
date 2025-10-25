/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Ethereum Auth utilities:
 * - Create a canonical "Sign In With Ethereum" (EIP-4361) message
 * - Verify Ethereum signatures
 * - Create and verify JWTs for session management
 *
 * Packages used:
 * - jose: JWT creation/verification with HS256
 * - ethers: Ethereum signature verification
 */

import {
  SignJWT,
  jwtVerify,
  type JWTPayload,
  type JWTVerifyResult,
} from "jose";
import { ethers } from "ethers";

// ---------- Types

export type SessionTokenPayload = JWTPayload & {
  // Standard subject: wallet address (checksummed)
  sub: string;
  // Random nonce used for the login attempt
  nonce: string;
  // Optional additional claims
  [key: string]: any;
};

export type SigninMessageParams = {
  // Domain asking for the sign-in (e.g., "example.com")
  domain: string;
  // Wallet address (checksummed)
  address: string;
  // Optional explanatory statement
  statement?: string;
  // URI of the site requesting sign-in
  uri?: string;
  // Chain ID (e.g., "1" for Ethereum mainnet, "8453" for Base)
  chainId?: string;
  // Version of the message; defaults to "1"
  version?: string;
  // Random nonce
  nonce: string;
  // Optional ISO datetime strings
  issuedAt?: string;
  expirationTime?: string;
  // Additional resources
  resources?: string[];
};

export type ValidateMessageOptions = {
  expectedDomain?: string;
  expectedAddress?: string;
  expectedNonce?: string;
  maxAgeSeconds?: number;
};

// ---------- Constants

const DEFAULT_JWT_EXPIRES_IN = "15m";
const DEFAULT_MESSAGE_VERSION = "1";

// ---------- Helpers: randomness

/**
 * Generate a cryptographically secure random nonce as hex string
 */
export function createNonce(length = 16): string {
  const buf = new Uint8Array(length);
  getRandomValues(buf);
  return Array.from(buf)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function getRandomValues(buf: Uint8Array) {
  const cryptoObj = (globalThis as any)?.crypto;
  if (cryptoObj?.getRandomValues) {
    cryptoObj.getRandomValues(buf);
    return;
  }
  throw new Error(
    "Secure crypto.getRandomValues is not available in this environment",
  );
}

// ---------- SIWE (Sign-In With Ethereum) message (EIP-4361)

/**
 * Build a canonical EIP-4361 sign-in message.
 * 
 * Format:
 * {domain} wants you to sign in with your Ethereum account:
 * {address}
 *
 * {statement}
 *
 * URI: {uri}
 * Version: {version}
 * Chain ID: {chainId}
 * Nonce: {nonce}
 * Issued At: {issuedAt}
 * Expiration Time: {expirationTime}
 * Resources:
 * - {resource1}
 * - {resource2}
 */
export function buildSignInMessage(params: SigninMessageParams): string {
  const {
    domain,
    address,
    statement,
    uri,
    chainId = "1",
    version = DEFAULT_MESSAGE_VERSION,
    nonce,
    issuedAt = new Date().toISOString(),
    expirationTime,
    resources,
  } = params;

  if (!isValidDomain(domain)) {
    throw new Error(`Invalid domain: ${domain}`);
  }
  if (!ethers.isAddress(address)) {
    throw new Error(`Invalid Ethereum address: ${address}`);
  }
  if (!nonce) {
    throw new Error("Nonce is required");
  }

  const lines: string[] = [];
  lines.push(`${domain} wants you to sign in with your Ethereum account:`);
  lines.push(address);
  lines.push(""); // blank line

  if (statement) {
    lines.push(statement);
    lines.push(""); // blank line after statement
  }

  lines.push(`URI: ${uri ?? `https://${domain}`}`);
  lines.push(`Version: ${version}`);
  lines.push(`Chain ID: ${chainId}`);
  lines.push(`Nonce: ${nonce}`);
  lines.push(`Issued At: ${issuedAt}`);
  if (expirationTime) {
    lines.push(`Expiration Time: ${expirationTime}`);
  }

  if (resources && resources.length > 0) {
    lines.push("Resources:");
    for (const r of resources) {
      lines.push(`- ${r}`);
    }
  }

  return lines.join("\n");
}

/**
 * Parse key fields from a sign-in message
 */
export function parseSignInMessage(message: string) {
  const domainMatch = message.match(/^([^\n]+?) wants you to sign in/i);
  const addressMatch = message.match(/^\s*(0x[a-fA-F0-9]{40})\s*$/m);
  const uriMatch = message.match(/^\s*URI:\s*(.+)\s*$/im);
  const versionMatch = message.match(/^\s*Version:\s*(.+)\s*$/im);
  const chainIdMatch = message.match(/^\s*Chain ID:\s*(.+)\s*$/im);
  const nonceMatch = message.match(/^\s*Nonce:\s*(.+)\s*$/im);
  const issuedAtMatch = message.match(/^\s*Issued At:\s*(.+)\s*$/im);
  const expirationMatch = message.match(/^\s*Expiration Time:\s*(.+)\s*$/im);

  let statement: string | undefined;
  {
    const parts = message.split("\n");
    const addrIndex = parts.findIndex(
      (l) => l.trim() === (addressMatch?.[1] ?? "").trim(),
    );
    const uriIndex = parts.findIndex((l) => /^\s*URI:/i.test(l));
    if (addrIndex >= 0 && uriIndex > addrIndex + 2) {
      const slice = parts.slice(addrIndex + 2, uriIndex);
      const joined = slice.join("\n").trim();
      if (joined) statement = joined;
    }
  }

  return {
    domain: domainMatch?.[1],
    address: addressMatch?.[1],
    statement,
    uri: uriMatch?.[1],
    version: versionMatch?.[1],
    chainId: chainIdMatch?.[1],
    nonce: nonceMatch?.[1],
    issuedAt: issuedAtMatch?.[1],
    expirationTime: expirationMatch?.[1],
  };
}

/**
 * Validate a sign-in message against expectations
 */
export function validateSignInMessage(
  message: string,
  opts: ValidateMessageOptions = {},
) {
  const parsed = parseSignInMessage(message);

  if (!parsed.domain || !isValidDomain(parsed.domain)) {
    throw new Error("Invalid or missing domain in message");
  }
  if (!parsed.address || !ethers.isAddress(parsed.address)) {
    throw new Error("Invalid or missing address in message");
  }
  if (!parsed.nonce) {
    throw new Error("Missing nonce in message");
  }
  if (!parsed.issuedAt) {
    throw new Error("Missing 'Issued At' in message");
  }

  const { expectedDomain, expectedAddress, expectedNonce, maxAgeSeconds } = opts;

  if (expectedDomain && !sameHost(parsed.domain, expectedDomain)) {
    throw new Error(
      `Domain mismatch. Expected ${expectedDomain}, got ${parsed.domain}`,
    );
  }
  if (expectedAddress && parsed.address.toLowerCase() !== expectedAddress.toLowerCase()) {
    throw new Error(
      `Address mismatch. Expected ${expectedAddress}, got ${parsed.address}`,
    );
  }
  if (expectedNonce && !constantTimeEquals(parsed.nonce, expectedNonce)) {
    throw new Error("Nonce mismatch");
  }

  if (maxAgeSeconds && parsed.issuedAt) {
    const now = Date.now();
    const issued = Date.parse(parsed.issuedAt);
    if (Number.isFinite(issued)) {
      const ageSec = Math.max(0, Math.floor((now - issued) / 1000));
      if (ageSec > maxAgeSeconds) {
        throw new Error(`Message too old (${ageSec}s > ${maxAgeSeconds}s)`);
      }
    }
  }

  if (parsed.expirationTime) {
    const exp = Date.parse(parsed.expirationTime);
    if (Number.isFinite(exp) && Date.now() > exp) {
      throw new Error("Message has expired");
    }
  }

  return parsed;
}

// ---------- Signature verification

export type VerifySignatureInput = {
  message: string;
  signature: string; // Hex signature from MetaMask
  address: string; // Expected signer address
};

/**
 * Verify an Ethereum signature using ethers.js
 */
export function verifyEthereumSignature(input: VerifySignatureInput): boolean {
  const { message, signature, address } = input;

  try {
    const recoveredAddress = ethers.verifyMessage(message, signature);
    return recoveredAddress.toLowerCase() === address.toLowerCase();
  } catch (error) {
    console.error("Signature verification error:", error);
    return false;
  }
}

// ---------- JWT helpers

export function getJwtSecret(): Uint8Array {
  const secret = process.env.AUTH_JWT_SECRET;
  if (!secret) {
    throw new Error("Missing AUTH_JWT_SECRET environment variable");
  }
  return new TextEncoder().encode(secret);
}

export type CreateSessionTokenInput = {
  address: string; // wallet address (checksummed)
  nonce: string;
  expiresIn?: string; // e.g., "15m", "1h"
  extra?: Record<string, any>;
};

export async function signSessionJwt(
  input: CreateSessionTokenInput,
): Promise<string> {
  const { address, nonce, expiresIn = DEFAULT_JWT_EXPIRES_IN, extra } = input;

  if (!ethers.isAddress(address)) {
    throw new Error("Invalid address for JWT 'sub'");
  }
  if (!nonce) {
    throw new Error("Nonce is required to create session token");
  }

  const secret = getJwtSecret();

  const payload: SessionTokenPayload = {
    sub: ethers.getAddress(address), // Checksum the address
    nonce,
    ...(extra ?? {}),
  };

  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secret);
}

export async function verifySessionJwt<
  T extends SessionTokenPayload = SessionTokenPayload,
>(token: string): Promise<JWTVerifyResult<T>> {
  const secret = getJwtSecret();
  return (await jwtVerify(token, secret)) as JWTVerifyResult<T>;
}

// ---------- Combined verification helper

export type VerifyLoginFlowInput = {
  message: string;
  signature: string;
  address: string;
  expectedDomain?: string;
  expectedNonce?: string;
  maxMessageAgeSeconds?: number;
};

/**
 * Full verification flow for a login attempt:
 * 1) Validate the message structure and expected fields
 * 2) Verify the signature with the provided address
 */
export function verifySignedLogin(input: VerifyLoginFlowInput) {
  const {
    message,
    signature,
    address,
    expectedDomain,
    expectedNonce,
    maxMessageAgeSeconds,
  } = input;

  const parsed = validateSignInMessage(message, {
    expectedDomain,
    expectedAddress: address,
    expectedNonce,
    maxAgeSeconds: maxMessageAgeSeconds,
  });

  const ok = verifyEthereumSignature({ message, signature, address });
  if (!ok) {
    throw new Error("Invalid signature");
  }

  return parsed;
}

// ---------- Internal utils

function isValidDomain(domain: string): boolean {
  if (!domain || domain.length > 255) return false;
  if (/^https?:\/\//i.test(domain)) return false;
  return /^[a-z0-9.-]+$/i.test(domain);
}

function sameHost(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function constantTimeEquals(a: string, b: string): boolean {
  const aBytes = new TextEncoder().encode(a);
  const bBytes = new TextEncoder().encode(b);
  if (aBytes.length !== bBytes.length) return false;
  let result = 0;
  for (let i = 0; i < aBytes.length; i++) {
    result |= aBytes[i] ^ bBytes[i];
  }
  return result === 0;
}
