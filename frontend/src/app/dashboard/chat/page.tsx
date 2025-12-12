'use client';

import ChatInterface from '@/components/ChatInterface';

export default function ChatPage() {
    return (
        <div className="h-full">
            <ChatInterface isDashboard={true} />
        </div>
    );
}