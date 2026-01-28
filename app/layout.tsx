import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "molt.tech | Transform. Evolve. Transcend.",
  description: "molt.tech - Your next evolution in technology. Transform your digital presence with cutting-edge solutions.",
  keywords: ["molt", "technology", "digital transformation", "evolution"],
  authors: [{ name: "molt.tech" }],
  openGraph: {
    title: "molt.tech | Transform. Evolve. Transcend.",
    description: "Your next evolution in technology.",
    type: "website",
  },
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
        {children}
      </body>
    </html>
  );
}
