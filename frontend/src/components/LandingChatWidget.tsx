'use client';

import { useState } from 'react';
import { MessageSquare, X } from 'lucide-react';
import ChatInterface from './ChatInterface';

export default function LandingChatWidget() {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
            {/* Chat Window */}
            {isOpen && (
                <div className="mb-4 w-[350px] shadow-2xl rounded-3xl overflow-hidden transition-all duration-300 animate-in slide-in-from-bottom-10 fade-in">
                    <ChatInterface />
                </div>
            )}

            {/* Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-14 h-14 bg-gradient-to-r from-primary-start to-primary-end text-white rounded-full flex items-center justify-center shadow-lg shadow-primary-start/30 hover:shadow-primary-start/50 transition-all hover:scale-105 active:scale-95"
            >
                {isOpen ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
            </button>
        </div>
    );
}
