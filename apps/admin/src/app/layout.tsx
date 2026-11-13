import type { Metadata } from 'next';
import { NO_FLASH_SCRIPT, ThemeProvider } from '@/lib/theme';
import './globals.css';
import { Epilogue, Roboto } from 'next/font/google';

// Same type pair as the public website. The existing stylesheet already reads these two variables.
const heading = Epilogue({ subsets: ['latin'], weight: ['500', '600', '700', '800'], variable: '--font-zoho-heading', display: 'swap' });
const sans = Roboto({ subsets: ['latin'], weight: ['400', '500', '700'], variable: '--font-zoho-sans', display: 'swap' });

export const metadata: Metadata = { 
  title: 'Archer Admin · Executive Operations', 
  robots: { index: false, follow: false } 
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" className={`${heading.variable} ${sans.variable}`} suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: NO_FLASH_SCRIPT }} /></head>
      <body><ThemeProvider>{children}</ThemeProvider></body>
    </html>
  );
}
