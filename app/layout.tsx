import type { Metadata } from "next";
import { Open_Sans } from "next/font/google";
import "./globals.css";

const openSans = Open_Sans({
  variable: "--font-open-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "NSE F&O Options Scalper | Automated Robot Signal & Pre-Alert Terminal",
  description: "Real-time automated NSE Option Scalping terminal with instant CE/PE entry-exit triggers, pre-alert warning radar, and multi-timeframe 1m-15m accuracy.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${openSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
