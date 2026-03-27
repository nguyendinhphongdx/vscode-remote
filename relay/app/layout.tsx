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
  openGraph: {
    type: "website",
    title: "VS Code Remote — Vibecode everywhere",
    description:
      "Connect to your remote machine with a 9-digit code. Full VS Code experience with terminal, file explorer, git, and port forwarding — all in your browser.",
    siteName: "VS Code Remote",
  },
  twitter: {
    card: "summary_large_image",
    title: "VS Code Remote — Vibecode everywhere",
    description:
      "Secure remote development from anywhere. Terminal, file explorer, git, port forwarding — all in your browser.",
  },
  robots: {
    index: true,
    follow: true,
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
