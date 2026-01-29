/**
 * Start X OAuth: generate PKCE, set cookies, redirect to X.
 */

import { NextRequest, NextResponse } from "next/server";
import { generatePKCE, getAuthUrl, X_OAUTH_STATE_COOKIE, X_OAUTH_VERIFIER_COOKIE } from "@/lib/x-oauth";
import { randomBytes } from "crypto";

export async function GET(req: NextRequest) {
  const clientId = process.env.X_CLIENT_ID;
  const redirectUri = process.env.X_REDIRECT_URI;
  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: "X OAuth not configured (X_CLIENT_ID, X_REDIRECT_URI)" },
      { status: 500 }
    );
  }

  const { codeVerifier, codeChallenge } = generatePKCE();
  const state = randomBytes(16).toString("hex");
  const url = getAuthUrl({
    clientId,
    redirectUri,
    codeChallenge,
    state,
  });

  // Debug: log the OAuth URL (without sensitive data)
  console.log("[X OAuth] Redirecting to:", url.replace(/code_challenge=[^&]+/, "code_challenge=***"));

  const res = NextResponse.redirect(url);
  const cookieOpts = { httpOnly: true, secure: process.env.NODE_ENV === "production", path: "/", maxAge: 600 };
  res.cookies.set(X_OAUTH_STATE_COOKIE, state, cookieOpts);
  res.cookies.set(X_OAUTH_VERIFIER_COOKIE, codeVerifier, cookieOpts);
  return res;
}
