import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PT Pro",
  description: "AI-powered personal training platform",
  appleWebApp: {
    capable: true,
    title: "PT Pro",
    statusBarStyle: "black-translucent",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
