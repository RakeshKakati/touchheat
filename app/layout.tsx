import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TouchHeat - Mobile Thumb Analytics",
  description: "Analytics tool for mobile thumb-reach patterns and touch interactions",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

