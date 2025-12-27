'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';

export const Navbar = () => {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    return (
        <nav className="fixed top-0 w-full z-50 px-4 md:px-6 py-4 transition-all duration-300 backdrop-blur-xl bg-white/70 border-b border-white/50 shadow-sm supports-[backdrop-filter]:bg-white/60">
            <div className="container mx-auto flex justify-between items-center relative z-10">
                <div className="flex items-center gap-2 relative z-50">
                    <Link href="/">
                        <img src="/logo.jpg" alt="ScriptishRx Logo" className="h-16 w-auto object-contain cursor-pointer" />
                    </Link>
                </div>

                {/* Desktop Nav */}
                <div className="hidden md:flex gap-8 text-sm font-medium text-slate-600">
                    <Link href="/#features" className="hover:text-primary-start transition-colors">Platform</Link>
                    <Link href="/#solutions" className="hover:text-primary-start transition-colors">Solutions</Link>
                    <Link href="/#pricing" className="hover:text-primary-start transition-colors">Pricing</Link>
                    <Link href="/legal" className="hover:text-primary-start transition-colors">Legal</Link>
                </div>

                <div className="hidden md:flex gap-4">
                    <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900 px-4 py-2">
                        Log in
                    </Link>
                    <Link href="/register" className="bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium px-5 py-2.5 rounded-full transition-shadow shadow-lg shadow-slate-900/20">
                        Get Started
                    </Link>
                </div>

                {/* Mobile Hamburger */}
                <button
                    className="md:hidden relative z-50 p-2 text-slate-600"
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                >
                    {mobileMenuOpen ? <X /> : <Menu />}
                </button>
            </div>

            {/* Mobile Menu Overlay & Drawer */}
            <div className={cn(
                "fixed inset-0 z-[60] md:hidden transition-all duration-300",
                mobileMenuOpen ? "visible" : "invisible delay-300"
            )}>
                {/* Backdrop */}
                <div
                    className={cn(
                        "absolute inset-0 bg-slate-900/20 backdrop-blur-sm transition-opacity duration-300",
                        mobileMenuOpen ? "opacity-100" : "opacity-0"
                    )}
                    onClick={() => setMobileMenuOpen(false)}
                />

                {/* Drawer */}
                <div className={cn(
                    "absolute right-0 top-0 h-full w-[85vw] max-w-sm bg-white shadow-2xl transition-transform duration-300 ease-out flex flex-col",
                    mobileMenuOpen ? "translate-x-0" : "translate-x-full"
                )}>
                    {/* Drawer Header */}
                    <div className="flex items-center justify-between p-6 border-b border-slate-100">
                        <img src="/logo.jpg" alt="ScriptishRx" className="h-10 w-auto" />
                        <button
                            onClick={() => setMobileMenuOpen(false)}
                            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Drawer Content */}
                    <div className="flex-1 overflow-y-auto py-6 px-6 space-y-8">
                        {/* Auth Actions (Prominent) */}
                        <div className="flex flex-col gap-3">
                            <Link href="/register" onClick={() => setMobileMenuOpen(false)}>
                                <Button className="w-full h-12 text-base font-semibold bg-primary-start hover:brightness-110 shadow-lg shadow-primary-start/20 rounded-xl">
                                    Join for Free
                                </Button>
                            </Link>
                            <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                                <Button variant="outline" className="w-full h-12 text-base font-medium border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-xl">
                                    Log in
                                </Button>
                            </Link>
                        </div>

                        {/* Navigation Links */}
                        <div className="flex flex-col space-y-2">
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Menu</p>
                            <Link
                                href="/#features"
                                onClick={() => setMobileMenuOpen(false)}
                                className="flex items-center justify-between p-3 -mx-3 text-slate-700 font-medium hover:bg-slate-50 hover:text-primary-start rounded-lg transition-colors"
                            >
                                Platform
                            </Link>
                            <Link
                                href="/#solutions"
                                onClick={() => setMobileMenuOpen(false)}
                                className="flex items-center justify-between p-3 -mx-3 text-slate-700 font-medium hover:bg-slate-50 hover:text-primary-start rounded-lg transition-colors"
                            >
                                Solutions
                            </Link>
                            <Link
                                href="/#pricing"
                                onClick={() => setMobileMenuOpen(false)}
                                className="flex items-center justify-between p-3 -mx-3 text-slate-700 font-medium hover:bg-slate-50 hover:text-primary-start rounded-lg transition-colors"
                            >
                                Pricing
                            </Link>
                            <Link
                                href="/legal"
                                onClick={() => setMobileMenuOpen(false)}
                                className="flex items-center justify-between p-3 -mx-3 text-slate-700 font-medium hover:bg-slate-50 hover:text-primary-start rounded-lg transition-colors"
                            >
                                Legal
                            </Link>
                            <Link
                                href="/#contact"
                                onClick={() => setMobileMenuOpen(false)}
                                className="flex items-center justify-between p-3 -mx-3 text-slate-700 font-medium hover:bg-slate-50 hover:text-primary-start rounded-lg transition-colors"
                            >
                                Contact
                            </Link>
                        </div>
                        <div className="pt-6 border-t border-slate-100">
                            <p className="text-xs text-slate-400 text-center">
                                © {new Date().getFullYear()} ScriptishRx LLC.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </nav>
    );
};
