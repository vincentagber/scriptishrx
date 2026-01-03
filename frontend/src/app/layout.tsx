import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Providers from './providers';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
    title: 'ScriptishRx | Modern Business CRM & Enterprise Management',
    description: 'Transform your business operations with ScriptishRx.',
    icons: '/logo.jpg',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body className={`${inter.variable} antialiased font-sans`}>
                <Providers>{children}</Providers>
            </body>
        </html>
    );
}
