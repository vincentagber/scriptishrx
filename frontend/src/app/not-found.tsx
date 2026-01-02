'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/Button'

export default function NotFound() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-50">
            <div className="text-center space-y-6">
                <h1 className="text-9xl font-black text-slate-200">404</h1>
                <h2 className="text-3xl font-bold text-slate-900">Page Not Found</h2>
                <p className="text-slate-500 max-w-md mx-auto">
                    The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
                </p>
                <Link href="/">
                    <Button className="h-12 px-8 rounded-xl bg-slate-900 text-white font-bold">
                        Return Home
                    </Button>
                </Link>
            </div>
        </div>
    )
}
