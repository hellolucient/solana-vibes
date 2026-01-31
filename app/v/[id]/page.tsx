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
  // Add stable cache key based on vibe update time
  const rawImageUrl = vibe?.imageUri || getFallbackImageUrl(id);
  const cacheKey = vibe?.createdAt ? new Date(vibe.createdAt).getTime() : id;
  const imageUrl = rawImageUrl.includes('?') 
    ? `${rawImageUrl}&v=${cacheKey}` 
    : `${rawImageUrl}?v=${cacheKey}`;
  
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

  // Use stored imageUri if available, otherwise fallback to base squiggly image
  const vibeImageUrl = vibe.imageUri || "/media/vibes4b.png";

  const formattedTime = new Date(vibe.createdAt)
    .toISOString()
    .replace("T", " ")
    .replace(/\.\d+Z$/, " UTC");

  return (
    <main className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Title */}
        <h1 className="text-2xl font-light tracking-wide text-center text-white/90 mb-4">
          solana_vibes
        </h1>

        {/* Vibe Image - The squiggly lines! */}
        <div className="mb-6">
          <img 
            src={vibeImageUrl} 
            alt="Vibe" 
            className="w-full rounded-xl"
          />
        </div>

        {/* Terminal-style info */}
        <div className="font-mono text-sm space-y-1 mb-2">
          <p className="text-[#00ff00]">&gt; received solana_vibes</p>
          <p className="text-[#00ff00]">&gt; verified by wallet {vibe.maskedWallet}</p>
          {vibe.mintAddress && (
            <p className="text-[#00ff00]">&gt; mint {vibe.mintAddress.slice(0, 4)}...{vibe.mintAddress.slice(-4)}</p>
          )}
          <p className="text-[#00ff00]/60">{formattedTime}</p>
          <p className="text-[#00ff00]">&gt; for @{vibe.targetUsername}</p>
        </div>

        {/* Claim section */}
        <VibeClaimClient
          vibeId={id}
          targetUsername={vibe.targetUsername}
          claimStatus={vibe.claimStatus}
          claimerWallet={vibe.claimerWallet}
          mintAddress={vibe.mintAddress}
          senderWallet={vibe.maskedWallet}
        />

      </div>
    </main>
  );
}
