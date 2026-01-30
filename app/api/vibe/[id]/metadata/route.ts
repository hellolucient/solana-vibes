/**
 * Serve vibe metadata JSON (for Vercel where filesystem is ephemeral).
 */

import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Validate ID format (basic alphanumeric check)
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  const metadataDir =
    process.env.VERCEL === "1"
      ? path.join("/tmp", "metadata")
      : path.join(process.cwd(), "public", "media", "metadata");

  const metadataPath = path.join(metadataDir, `${id}.json`);

  try {
    const content = await readFile(metadataPath, "utf-8");
    const metadata = JSON.parse(content);

    return NextResponse.json(metadata, {
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Type": "application/json",
      },
    });
  } catch (e) {
    console.error(`[metadata] Not found: ${id}`, e);
    return NextResponse.json({ error: "Metadata not found" }, { status: 404 });
  }
}
