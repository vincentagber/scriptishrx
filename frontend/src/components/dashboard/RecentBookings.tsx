import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { useRecentBookings } from '@/hooks/useDashboardData';
import { cn } from '@/lib/utils';

export function RecentBookings() {
    const { data: bookings, isLoading } = useRecentBookings();

    return (
        <GlassCard>
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-zinc-900">Recent Transactions</h3>
                <Button variant="ghost" size="sm" className="text-primary-end hover:bg-primary-start/10">View All</Button>
            </div>

            <div className="overflow-x-auto min-h-[200px]">
                {isLoading ? (
                    <div className="flex items-center justify-center h-40 text-zinc-400">Loading...</div>
                ) : (
                    <table className="w-full">
                        <thead>
                            <tr className="text-left text-xs font-medium text-zinc-400 uppercase tracking-wider border-b border-zinc-100">
                                <th className="pb-4 pl-4">Date</th>
                                <th className="pb-4">Client</th>
                                <th className="pb-4">Status</th>
                                <th className="pb-4 text-right pr-4">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100">
                            {bookings && bookings.length > 0 ? (
                                bookings.map((booking: any, idx: number) => (
                                    <tr key={booking.id || idx} className="group hover:bg-zinc-50 transition-colors">
                                        <td className="py-4 pl-4 text-sm text-zinc-600 font-medium">
                                            {new Date(booking.date).toLocaleString('en-US', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                        </td>
                                        <td className="py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-xs font-bold text-zinc-600 border border-zinc-200">
                                                    {booking.client?.name?.charAt(0) || 'U'}
                                                </div>
                                                <span className="text-sm font-medium text-zinc-900 group-hover:text-primary-start transition-colors">
                                                    {booking.client?.name || 'Unknown User'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="py-4">
                                            <StatusBadge status={booking.status} />
                                        </td>
                                        <td className="py-4 pr-4 text-right text-sm font-bold text-zinc-900">
                                            $49.99
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={4} className="py-8 text-center text-zinc-400">No recent activity detected.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>
        </GlassCard>
    );
}

function StatusBadge({ status }: { status: string }) {
    const styles = {
        Confirmed: "bg-emerald-500/20 text-emerald-400 border-emerald-500/20",
        Scheduled: "bg-blue-500/20 text-blue-400 border-blue-500/20",
        Cancelled: "bg-rose-500/20 text-rose-400 border-rose-500/20",
        Pending: "bg-orange-500/20 text-orange-400 border-orange-500/20",
    }
    const safeStatus = status || 'Pending';
    // @ts-ignore
    const style = styles[safeStatus] || styles.Pending;

    return (
        <span className={cn("px-2.5 py-1 rounded-full text-xs font-medium border", style)}>
            {safeStatus}
        </span>
    )
}
