import type { Metadata, Viewport } from "next";
import { Geist_Mono, Inter } from "next/font/google";
import "./globals.css";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "VS Code Remote — Vibecode everywhere",
    template: "%s | VS Code Remote",
  },
  description:
    "Access your remote development environment from any browser. Full VS Code experience with terminal, file explorer, git integration, and port forwarding — secured with JWT authentication.",
  keywords: [
    "remote development",
    "VS Code",
    "code editor",
    "browser IDE",
    "remote terminal",
    "port forwarding",
    "git integration",
    "WebSocket",
    "PWA",
  ],
  authors: [{ name: "VS Code Remote" }],
  alternates: {
    canonical: "https://vscode-remote.onrender.com",
  },
  openGraph: {
    type: "website",
    url: "https://vscode-remote.onrender.com",
    title: "VS Code Remote — Vibecode everywhere",
    description:
      "Connect to your remote machine with a 9-digit code. Full VS Code experience with terminal, file explorer, git, and port forwarding — all in your browser.",
    siteName: "VS Code Remote",
    images: [
      {
        url: "https://vscode-remote.onrender.com/og-image.png",
        width: 1200,
        height: 630,
        alt: "VS Code Remote - Remote development from anywhere",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "VS Code Remote — Vibecode everywhere",
    description:
      "Secure remote development from anywhere. Terminal, file explorer, git, port forwarding — all in your browser.",
    images: ["https://vscode-remote.onrender.com/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "VSRemote",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#1e1e1e",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistMono.variable} ${inter.variable} h-full`} suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              "name": "VS Code Remote",
              "description": "Access your remote development environment from any browser. Full VS Code experience with terminal, file explorer, git integration, and port forwarding — secured with JWT authentication.",
              "url": "https://vscode-remote.onrender.com",
              "applicationCategory": "DeveloperApplication",
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "USD"
              },
              "author": {
                "@type": "Organization",
                "name": "VS Code Remote"
              }
            }),
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js');
                });
              }
            `,
          }}
        />
      </head>
      <body className="h-full overflow-hidden">
        {children}
      </body>
    </html>
  );
}
