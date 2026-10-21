import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "NAPS — NYSC Automated Posting & Mobilisation System",
  description:
    "Multi-Criteria Decision Making (AHP + TOPSIS) NYSC Posting System with Security Risk Assessment, Senate List Verification, and Skills-Based PPA Matching.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
