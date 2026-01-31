"use client";

import Link from "next/link";

// Spinning arc icon for buttons
const SolanaArc = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" className="animate-spin" style={{ animationDuration: '2s' }}>
    <defs>
      <linearGradient id="solana-arc-btn" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#9945FF" />
        <stop offset="50%" stopColor="#00D4FF" />
        <stop offset="100%" stopColor="#14F195" />
      </linearGradient>
    </defs>
    <path
      d="M12 2a10 10 0 0 1 10 10"
      fill="none"
      stroke="url(#solana-arc-btn)"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
  </svg>
);

// Traveling orb that moves behind the title
const TitlePulse = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    <svg 
      className="w-full h-full"
      viewBox="0 0 200 30"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <filter id="title-glow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      
      {/* Main traveling orb - smaller size */}
      <circle r="4" filter="url(#title-glow)">
        <animate
          attributeName="fill"
          values="#9945FF;#00D4FF;#14F195;#00D4FF;#9945FF"
          dur="2s"
          repeatCount="indefinite"
        />
        <animate
          attributeName="opacity"
          values="0;0.8;0.8;0.8;0"
          dur="3s"
          repeatCount="indefinite"
        />
        <animateMotion
          dur="3s"
          repeatCount="indefinite"
          path="M -10,15 L 210,15"
        />
      </circle>
      
      {/* Trail - smaller */}
      <circle r="2.5" filter="url(#title-glow)">
        <animate
          attributeName="fill"
          values="#9945FF;#00D4FF;#14F195;#00D4FF;#9945FF"
          dur="2s"
          repeatCount="indefinite"
        />
        <animate
          attributeName="opacity"
          values="0;0.4;0.4;0.4;0"
          dur="3s"
          repeatCount="indefinite"
        />
        <animateMotion
          dur="3s"
          repeatCount="indefinite"
          begin="-0.1s"
          path="M -10,15 L 210,15"
        />
      </circle>
    </svg>
  </div>
);

// Step card component
const StepCard = ({ 
  number, 
  title, 
  description 
}: { 
  number: number; 
  title: string; 
  description: string;
}) => (
  <div className="flex gap-4 items-start">
    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-[#9945FF]/20 via-[#00D4FF]/20 to-[#14F195]/20 border border-white/10 flex items-center justify-center">
      <span className="text-white/80 font-medium">{number}</span>
    </div>
    <div>
      <h3 className="text-white font-medium mb-1">{title}</h3>
      <p className="text-white/50 text-sm leading-relaxed">{description}</p>
    </div>
  </div>
);

export default function GuidePage() {
  return (
    <main className="min-h-screen bg-[#030303] flex flex-col items-center px-4 py-12">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="relative inline-block mb-4">
          <TitlePulse />
          <h1 className="text-2xl font-medium text-white relative z-10 px-4">solana_vibes</h1>
        </div>
        <p className="text-white/40 text-sm">good vibes, on-chain</p>
      </div>

      {/* Main content */}
      <div className="w-full max-w-md space-y-8">
        
        {/* What is it */}
        <div className="p-6 rounded-2xl bg-gradient-to-br from-[#9945FF]/5 via-[#00D4FF]/5 to-[#14F195]/5 border border-white/5">
          <h2 className="text-white/80 font-medium mb-3">what is solana_vibes?</h2>
          <p className="text-white/50 text-sm leading-relaxed">
            Send good vibes to anyone on X. Each vibe is a unique NFT on Solana 
            that lives in their wallet forever. No spam. No scams. Just vibes.
          </p>
        </div>

        {/* Send a Vibe */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#14F195]/30 to-transparent" />
            <h2 className="text-[#14F195] font-medium text-sm uppercase tracking-wider">Send a Vibe</h2>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#14F195]/30 to-transparent" />
          </div>
          
          <div className="p-6 rounded-2xl bg-[#0a0a0a] border border-white/5 space-y-6">
            <StepCard 
              number={1} 
              title="Connect" 
              description="Connect your X account and Solana wallet."
            />
            <StepCard 
              number={2} 
              title="Choose" 
              description="Enter the X handle of whoever you want to vibe."
            />
            <StepCard 
              number={3} 
              title="Send" 
              description="Confirm the transaction and share the link."
            />
          </div>
        </div>

        {/* Claim a Vibe */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#00D4FF]/30 to-transparent" />
            <h2 className="text-[#00D4FF] font-medium text-sm uppercase tracking-wider">Claim a Vibe</h2>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#00D4FF]/30 to-transparent" />
          </div>
          
          <div className="p-6 rounded-2xl bg-[#0a0a0a] border border-white/5 space-y-6">
            <StepCard 
              number={1} 
              title="Verify" 
              description="Connect your X account to prove you're the recipient."
            />
            <StepCard 
              number={2} 
              title="Connect" 
              description="Connect your Solana wallet to receive the NFT."
            />
            <StepCard 
              number={3} 
              title="Claim" 
              description="Confirm the transaction and it's yours forever."
            />
          </div>
        </div>

        {/* CTA */}
        <div className="pt-4">
          <Link
            href="/"
            className="flex items-center justify-center gap-2 w-full py-4 rounded-xl bg-gradient-to-r from-[#150d1f] to-[#0a1210] border border-[rgba(153,69,255,0.3)] text-white font-medium hover:from-[#1c1128] hover:to-[#0d1815] hover:border-[rgba(20,241,149,0.4)] hover:shadow-[0_0_15px_rgba(153,69,255,0.1),0_0_15px_rgba(20,241,149,0.1)] transition-all"
          >
            <SolanaArc />
            <span>start vibing</span>
          </Link>
        </div>

        {/* Footer */}
        <p className="text-center text-white/20 text-xs pt-4">
          powered by Solana
        </p>
      </div>
    </main>
  );
}
