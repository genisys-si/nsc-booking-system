import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import SessionProviderWrapper from "@/components/providers/SessionProviderWrapper";
import { Suspense } from "react";

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
  description:
    "National Sports Concil Booking System for venues and facilities across Solomon Islands",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Suspense fallback={<div />}>
          <SessionProviderWrapper>{children}</SessionProviderWrapper>
        </Suspense>

        <Toaster
          position="top-right"
          richColors
          closeButton
          duration={4500}
          theme="system"
          toastOptions={{
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
