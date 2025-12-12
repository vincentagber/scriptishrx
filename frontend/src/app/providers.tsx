'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/react-query';
import { useState } from 'react';

export default function Providers({ children }: { children: React.ReactNode }) {
    // Ensure QueryClient is stable across re-renders
    const [client] = useState(() => queryClient);

    return (
        <QueryClientProvider client={client}>
            {children}
        </QueryClientProvider>
    );
}
