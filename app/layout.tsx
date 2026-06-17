import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Prospect Agent",
  description: "Research a company and draft a cold opener from one real signal.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-[#0f0f12] text-white antialiased">{children}</body>
    </html>
  );
}
