import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Java Internals Visualizer — See the JVM, Live',
  description:
    'JIV is a real-time educational platform that visualizes how Java programs execute inside the JVM. See stack frames, heap objects, garbage collection, and thread states come alive.',
  keywords: [
    'Java', 'JVM', 'visualizer', 'debugger', 'heap', 'stack', 'garbage collection',
    'Java internals', 'bytecode', 'education', 'programming',
  ],
  openGraph: {
    title: 'Java Internals Visualizer',
    description: 'Chrome DevTools for the JVM',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} font-sans antialiased`}
        style={{ background: '#f5f5f3', color: '#111111' }}
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
