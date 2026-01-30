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

  // Use stored imageUri if available, otherwise fallback
  const imageUrl = vibe.imageUri || getFallbackImageUrl(id);

  return (
    <main className="min-h-screen bg-black flex flex-col items-center justify-center p-4 font-mono">
      {/* The vibe image (text overlay is baked into the image) */}
      <div className="rounded overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt={`Vibe for @${vibe.targetUsername}`}
          className="block w-full max-w-lg h-auto"
        />
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
