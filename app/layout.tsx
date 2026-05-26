import type { Metadata } from 'next';
import { Playfair_Display, Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import Navbar from '@/components/Navbar';
import InkCanvas from '@/components/InkCanvas';

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'Versecraft — AI-Powered Literary Companion',
  description: 'Where literature lives and breathes',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${playfair.variable} ${inter.variable} bg-[#F8F4E9] text-[#1a1a1a] antialiased`}>
        <AuthProvider>
          <InkCanvas />
          <Navbar />
          <main className="relative z-10">
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
