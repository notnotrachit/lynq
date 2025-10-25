/**
 * Twitter OAuth 2.0 Implementation
 * Uses PKCE flow for secure authentication
 */

import crypto from 'crypto';

export type TwitterOAuthConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
};

export type TwitterUserInfo = {
  id: string;
  username: string;
  name: string;
};

export type OAuthState = {
  walletAddress: string;
  codeVerifier: string;
  timestamp: number;
};

/**
 * Generate PKCE code verifier and challenge
 */
export function generatePKCE() {
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');
  
  return { codeVerifier, codeChallenge };
}

/**
 * Generate OAuth state parameter
 */
export function generateState(walletAddress: string, codeVerifier: string): string {
  const state: OAuthState = {
    walletAddress,
    codeVerifier,
    timestamp: Date.now(),
  };
  
  // Encode state as base64
  return Buffer.from(JSON.stringify(state)).toString('base64url');
}

/**
 * Decode OAuth state parameter
 */
export function decodeState(stateParam: string): OAuthState | null {
  try {
    const decoded = Buffer.from(stateParam, 'base64url').toString('utf-8');
    const state: OAuthState = JSON.parse(decoded);
    
    // Verify state is not too old (10 minutes)
    if (Date.now() - state.timestamp > 10 * 60 * 1000) {
      return null;
    }
    
    return state;
  } catch {
    return null;
  }
}

/**
 * Get Twitter OAuth authorization URL
 */
export function getTwitterAuthUrl(
  config: TwitterOAuthConfig,
  walletAddress: string
): { url: string; codeVerifier: string } {
  const { codeVerifier, codeChallenge } = generatePKCE();
  const state = generateState(walletAddress, codeVerifier);
  
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    scope: 'tweet.read users.read offline.access',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });
  
  const url = `https://twitter.com/i/oauth2/authorize?${params.toString()}`;
  
  return { url, codeVerifier };
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeCodeForToken(
  config: TwitterOAuthConfig,
  code: string,
  codeVerifier: string
): Promise<{ accessToken: string; refreshToken?: string }> {
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: config.redirectUri,
    code_verifier: codeVerifier,
    client_id: config.clientId,
  });
  
  const response = await fetch('https://api.twitter.com/2/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${Buffer.from(
        `${config.clientId}:${config.clientSecret}`
      ).toString('base64')}`,
    },
    body: params.toString(),
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to exchange code for token: ${error}`);
  }
  
  const data = await response.json();
  
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
  };
}

/**
 * Get Twitter user information
 */
export async function getTwitterUserInfo(accessToken: string): Promise<TwitterUserInfo> {
  const response = await fetch(
    'https://api.twitter.com/2/users/me?user.fields=username,name',
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get user info: ${error}`);
  }
  
  const data = await response.json();
  
  return {
    id: data.data.id,
    username: data.data.username,
    name: data.data.name,
  };
}

/**
 * Get OAuth configuration from environment
 */
export function getTwitterOAuthConfig(): TwitterOAuthConfig {
  const clientId = process.env.TWITTER_CLIENT_ID;
  const clientSecret = process.env.TWITTER_CLIENT_SECRET;
  const redirectUri = process.env.TWITTER_REDIRECT_URI || 
    `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/oauth/twitter/callback`;
  
  if (!clientId || !clientSecret) {
    throw new Error('Twitter OAuth credentials not configured');
  }
  
  return { clientId, clientSecret, redirectUri };
}
