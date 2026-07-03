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

// Runs before paint so the saved theme applies without a flash
const themeInit = `(function(){try{var t=localStorage.getItem("pt-pro-theme");if(!t){t=window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark"}document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
