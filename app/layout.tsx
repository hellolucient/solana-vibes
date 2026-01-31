import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { WalletProvider } from "@/components/WalletProvider";

const jetbrainsMono = localFont({
  src: "../lib/fonts/JetBrainsMono-Regular.ttf",
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "solana_vibes",
    template: "%s | solana_vibes",
  },
  description: "Send vibes on Solana",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={jetbrainsMono.variable}>
      <body className="min-h-screen antialiased bg-[#050505]">
        <WalletProvider>{children}</WalletProvider>
      </body>
    </html>
  );
}
