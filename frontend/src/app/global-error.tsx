'use client'

import { Inter } from 'next/font/google'
import '@/app/globals.css'

const inter = Inter({ subsets: ['latin'] })

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    return (
        <html lang="en">
            <body className={`${inter.className} min-h-screen bg-white flex flex-col items-center justify-center p-4`}>
                <div className="max-w-md w-full text-center space-y-6">
                    <div className="p-4 bg-red-50 text-red-600 rounded-2xl border border-red-100 font-mono text-sm break-all">
                        {error.message || 'An unexpected error occurred'}
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900">Something went wrong!</h2>
                    <p className="text-slate-500">We encountered an error while rendering this page.</p>
                    <button
                        onClick={() => reset()}
                        className="px-6 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all"
                    >
                        Try again
                    </button>
                </div>
            </body>
        </html>
    )
}
