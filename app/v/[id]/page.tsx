import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { devVibeStore } from "@/lib/storage/dev-store";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const imageUrl = baseUrl ? `${baseUrl}/media/vibes/${id}.png` : `/media/vibes/${id}.png`;
  return {
    title: " ",
    description: " ",
    openGraph: { title: " ", description: " ", images: [imageUrl] },
    twitter: { card: "summary_large_image", title: " ", description: " ", images: [imageUrl] },
  };
}

export default async function VibePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const vibe = await devVibeStore.getById(id);
  if (!vibe) notFound();

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const imageUrl = baseUrl ? `${baseUrl}/media/vibes/${id}.png` : `/media/vibes/${id}.png`;

  return (
    <main className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
      <div className="bg-black rounded overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt="Solana vibe"
          className="block w-full max-w-md h-auto"
          style={{ imageRendering: "crisp-edges" }}
        />
      </div>
      <p className="mt-4 font-mono text-sm text-green-500 text-center">
        &gt; received solana_vibes
        <br />
        &gt; verified by wallet {vibe.maskedWallet}
      </p>
      <p className="mt-2 text-neutral-500 text-xs">
        {new Date(vibe.createdAt).toISOString()}
      </p>
    </main>
  );
}
