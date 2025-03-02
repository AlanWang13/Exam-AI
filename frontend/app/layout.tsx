import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/toaster';
import { WebSocketProvider } from '@/hooks/websocket-context';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'ExamAI - AI Study Buddy',
  description: 'Create exams and study guides for your classes with AI assistance',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <WebSocketProvider url="ws://127.0.0.1:8000/ws">
          <ThemeProvider attribute="class" defaultTheme="dark">
            {children}
            <Toaster />
          </ThemeProvider>
        </WebSocketProvider>
      </body>
    </html>
  );
}