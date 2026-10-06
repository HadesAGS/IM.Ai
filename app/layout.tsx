import type { Metadata } from "next";
import "./globals.css";
import "./aperture.css";

export const metadata: Metadata = {
  title: "Aperture — Look closer. Make it yours.",
  description: "Ask questions about your images and edit precisely where you choose.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
