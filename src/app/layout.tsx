import type { Metadata, Viewport } from 'next';
import { Space_Grotesk, Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';

/**
 * Fonts are self-hosted at build time via next/font — zero layout shift,
 * no external requests, and exposed as CSS variables consumed by Tailwind.
 */
const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
  weight: ['400', '500'],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://meta.papagedon.com'),
  icons: { icon: '/meta/papagedon-mark.png', apple: '/meta/papagedon-mark.png' },
  title: 'PAPAGEDON AEI — Audio Experience Intelligence',
  description:
    'PAPAGEDON AEI: the PAPAGEDON visual engine directed live by Meta models — event flyer in, director-run show out.',
};

export const viewport: Viewport = {
  themeColor: '#050505',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="grain bg-background text-foreground">{children}</body>
    </html>
  );
}
