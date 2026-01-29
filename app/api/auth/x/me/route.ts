/**
 * Check X OAuth status. Returns current user or { connected: false }.
 * Uses 200 for "not connected" so the browser doesn't log 401 on every page load.
 */

import { NextRequest, NextResponse } from "next/server";
import { getXUser } from "@/lib/x-oauth";
import { X_OAUTH_COOKIE } from "@/lib/x-oauth";

export async function GET(req: NextRequest) {
  const accessToken = req.cookies.get(X_OAUTH_COOKIE)?.value;
  if (!accessToken) {
    return NextResponse.json({ connected: false });
  }
  try {
    const user = await getXUser(accessToken);
    return NextResponse.json({
      connected: true,
      id: user.id,
      username: user.username,
      name: user.name,
      profile_image_url: user.profile_image_url,
    });
  } catch (e) {
    // Token is invalid/expired - clear it
    console.log("[X OAuth] Token validation failed, clearing cookie:", e instanceof Error ? e.message : "unknown");
    const res = NextResponse.json({ connected: false });
    res.cookies.delete(X_OAUTH_COOKIE);
    return res;
  }
}
