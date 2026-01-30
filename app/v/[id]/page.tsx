import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { devVibeStore } from "@/lib/storage/dev-store";
import { VibeClaimClient } from "./VibeClaimClient";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

function getImageUrl(id: string): string {
  // On Vercel images are served from /tmp via API; locally from static /media/vibes.
  if (process.env.VERCEL === "1") {
    return baseUrl ? `${baseUrl}/api/vibe/image/${id}` : `/api/vibe/image/${id}`;
  }
  return baseUrl ? `${baseUrl}/media/vibes/${id}.png` : `/media/vibes/${id}.png`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const vibe = await devVibeStore.getById(id);
  const handle = vibe ? `@${vibe.targetUsername}` : "someone";
  const imageUrl = getImageUrl(id);
  
  return {
    title: `Vibe for ${handle}`,
    description: `A solana_vibes gift for ${handle}`,
    openGraph: { 
      title: `Vibe for ${handle}`, 
      description: `A solana_vibes gift for ${handle}`, 
      images: [imageUrl] 
    },
    twitter: { 
      card: "summary_large_image", 
      title: `Vibe for ${handle}`, 
      description: `A solana_vibes gift for ${handle}`, 
      images: [imageUrl] 
    },
  };
}

export default async function VibePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const vibe = await devVibeStore.getById(id);
  if (!vibe) notFound();

  const imageUrl = getImageUrl(id);

  const formattedTime = new Date(vibe.createdAt)
    .toISOString()
    .replace("T", " ")
    .replace(/\.\d+Z$/, " UTC");

  return (
    <main className="min-h-screen bg-black flex flex-col items-center justify-center p-4 font-mono">
      {/* The vibe image */}
      <div className="rounded overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt={`Vibe for @${vibe.targetUsername}`}
          className="block w-full max-w-lg h-auto"
        />
      </div>

      {/* Vibe info */}
      <div className="mt-4 text-center text-sm">
        <p className="text-green-500">
          <span className="text-neutral-500">&gt;</span> received solana_vibes
        </p>
        <p className="text-green-500">
          <span className="text-neutral-500">&gt;</span> verified by wallet {vibe.maskedWallet}
        </p>
        {vibe.mintAddress && (
          <p className="text-green-500">
            <span className="text-neutral-500">&gt;</span> mint {vibe.mintAddress.slice(0, 4)}…{vibe.mintAddress.slice(-4)}
          </p>
        )}
        <p className="text-neutral-600 text-xs mt-2">{formattedTime}</p>
      </div>

      {/* Claim section */}
      <VibeClaimClient
        vibeId={id}
        targetUsername={vibe.targetUsername}
        claimStatus={vibe.claimStatus}
        claimerWallet={vibe.claimerWallet}
        mintAddress={vibe.mintAddress}
      />
    </main>
  );
}
