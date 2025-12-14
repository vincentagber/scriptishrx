import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

export function useDashboardStats() {
    return useQuery({
        queryKey: ['dashboard', 'stats'],
        queryFn: async () => {
            const { data } = await api.get('/clients/stats');
            return data;
        },
        refetchInterval: 10000, // Poll every 10 seconds for realtime updates
        refetchOnWindowFocus: true
    });
}

export function useRecentBookings() {
    return useQuery({
        queryKey: ['dashboard', 'bookings'],
        queryFn: async () => {
            const { data } = await api.get('/bookings');
            // Sort by date desc and take top 5
            return Array.isArray(data)
                ? data.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5)
                : [];
        }
    });
}
