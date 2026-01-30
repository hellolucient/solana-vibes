import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { vibeStore } from "@/lib/storage/supabase";
import { VibeClaimClient } from "./VibeClaimClient";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

function getFallbackImageUrl(id: string): string {
  // Fallback for vibes without stored imageUri
  return baseUrl ? `${baseUrl}/media/vibes/${id}.png` : `/media/vibes/${id}.png`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const vibe = await vibeStore.getById(id);
  // Use stored imageUri if available, otherwise fallback
  const imageUrl = vibe?.imageUri || getFallbackImageUrl(id);
  
  // Code-style title for Twitter card
  const cardTitle = ">_";
  
  return {
    title: cardTitle,
    description: cardTitle,
    openGraph: { 
      title: cardTitle, 
      description: cardTitle,
      siteName: cardTitle,
      images: [{
        url: imageUrl,
        width: 1200,
        height: 630,
        alt: cardTitle,
      }],
    },
    twitter: { 
      card: "summary_large_image", 
      title: cardTitle, 
      description: cardTitle,
      images: [{
        url: imageUrl,
        alt: cardTitle,
      }],
    },
  };
}

export default async function VibePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const vibe = await vibeStore.getById(id);
  if (!vibe) notFound();

  const formattedTime = new Date(vibe.createdAt)
    .toISOString()
    .replace("T", " ")
    .replace(/\.\d+Z$/, " UTC");

  return (
    <main className="min-h-screen bg-black flex flex-col items-center justify-center p-4 font-mono">
      {/* Vibe info (displayed as text, image is for Twitter card only) */}
      <div className="text-center text-sm space-y-1">
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
        <p className="text-green-500 mt-4">
          <span className="text-neutral-500">&gt;</span> for <span className="text-green-400">@{vibe.targetUsername}</span>
        </p>
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
