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
    <main className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Title */}
        <h1 className="text-2xl font-light tracking-wide text-center text-white/90 mb-8">
          solana_vibes
        </h1>

        {/* Vibe Card */}
        <div className="rounded-2xl bg-gradient-to-br from-[#9945FF]/10 via-[#00D4FF]/5 to-[#14F195]/10 border border-white/10 p-6">
          {/* Recipient */}
          <div className="text-center mb-6">
            <p className="text-white/40 text-sm mb-1">vibe for</p>
            <p className="text-2xl font-medium text-[#14F195]">@{vibe.targetUsername}</p>
          </div>

          {/* Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mb-6" />

          {/* Details */}
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-white/40">from</span>
              <span className="text-white/70 font-mono">{vibe.maskedWallet}</span>
            </div>
            {vibe.mintAddress && (
              <div className="flex justify-between items-center">
                <span className="text-white/40">mint</span>
                <span className="text-white/70 font-mono">
                  {vibe.mintAddress.slice(0, 6)}...{vibe.mintAddress.slice(-6)}
                </span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-white/40">created</span>
              <span className="text-white/50 text-xs">{formattedTime}</span>
            </div>
          </div>
        </div>

        {/* Claim section */}
        <VibeClaimClient
          vibeId={id}
          targetUsername={vibe.targetUsername}
          claimStatus={vibe.claimStatus}
          claimerWallet={vibe.claimerWallet}
          mintAddress={vibe.mintAddress}
        />

        {/* Back to home link */}
        <a
          href="/"
          className="block mt-8 text-center text-white/30 hover:text-white/50 text-sm transition-colors"
        >
          send your own vibe
        </a>
      </div>
    </main>
  );
}
