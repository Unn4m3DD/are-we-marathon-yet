import type { Metadata, Viewport } from "next";
import { Providers } from "@/app/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Are We Marathon Yet",
  description: "A UUID-scoped marathon training planner and workout log.",
  applicationName: "Are We Marathon Yet",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Marathon Yet",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: "/favicon.svg",
    apple: "/icons/icon-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var t=localStorage.getItem('awm_theme');if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}",
          }}
        />
      </head>
      <body className="min-h-full">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
