import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import  SessionProviderWrapper  from "@/components/providers/SessionProviderWrapper";
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NSC Booking System",
  description: "National Sports Concil Booking System for venues and facilities across Solomon Islands",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SessionProviderWrapper>
          {children}
        </SessionProviderWrapper>
        <Toaster
          position="top-right"         // or "top-center", "bottom-right", etc.
          richColors                   // nicer colors for success/error/info
          closeButton                  // shows × button
          duration={4500}              // how long toasts stay visible
          theme="system"               // auto dark/light mode
          toastOptions={{
            // Optional global styling overrides
            className: "border border-border rounded-md shadow-lg",
            style: {
              background: "hsl(var(--background))",
              color: "hsl(var(--foreground))",
            },
          }}
        />
      </body>
    </html>
  );
}
