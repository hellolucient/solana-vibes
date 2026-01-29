/**
 * X OAuth callback: exchange code for token, set cookie, redirect to app.
 */

import { NextRequest, NextResponse } from "next/server";
import { exchangeCode, X_OAUTH_COOKIE, X_OAUTH_STATE_COOKIE, X_OAUTH_VERIFIER_COOKIE } from "@/lib/x-oauth";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(new URL(`/?error=x_oauth&message=${encodeURIComponent(error)}`, req.url));
  }

  const stateCookie = req.cookies.get(X_OAUTH_STATE_COOKIE)?.value;
  const codeVerifier = req.cookies.get(X_OAUTH_VERIFIER_COOKIE)?.value;

  if (!code || !state || state !== stateCookie || !codeVerifier) {
    return NextResponse.redirect(new URL("/?error=x_oauth&message=invalid_callback", req.url));
  }

  const clientId = process.env.X_CLIENT_ID;
  const clientSecret = process.env.X_CLIENT_SECRET;
  const redirectUri = process.env.X_REDIRECT_URI;
  if (!clientId || !redirectUri) {
    return NextResponse.redirect(new URL("/?error=x_oauth&message=config", req.url));
  }

  try {
    const token = await exchangeCode({
      code,
      codeVerifier,
      clientId,
      redirectUri,
      clientSecret: clientSecret ?? undefined,
    });
    const res = NextResponse.redirect(new URL("/", req.url));
    res.cookies.set(X_OAUTH_COOKIE, token.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });
    res.cookies.delete(X_OAUTH_STATE_COOKIE);
    res.cookies.delete(X_OAUTH_VERIFIER_COOKIE);
    console.log("[X OAuth] Successfully exchanged code for token");
    return res;
  } catch (e) {
    console.error("[X OAuth] Token exchange failed:", e);
    const message = e instanceof Error ? e.message : "exchange_failed";
    const res = NextResponse.redirect(new URL(`/?error=x_oauth&message=${encodeURIComponent(message)}`, req.url));
    // Clear any stale cookies on error
    res.cookies.delete(X_OAUTH_COOKIE);
    res.cookies.delete(X_OAUTH_STATE_COOKIE);
    res.cookies.delete(X_OAUTH_VERIFIER_COOKIE);
    return res;
  }
}
