import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Providers from './providers';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
    title: 'ScriptishRx | Modern Business CRM & Enterprise Management',
    description: 'Transform your business operations with ScriptishRx. AI-powered client management, automated scheduling, and smart workflows.',
    icons: {
        icon: '/logo.jpg',
        apple: '/logo.jpg',
    },
};

export const viewport = {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
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
