import type { Metadata } from "next";
import "./globals.css";
import { WalletProvider } from "@/components/WalletProvider";

export const metadata: Metadata = {
  title: {
    default: "solana_vibes",
    template: "%s | solana_vibes",
  },
  description: "Send vibes on Solana",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased bg-[#050505]">
        <WalletProvider>{children}</WalletProvider>
      </body>
    </html>
  );
}
