import { GlassCard } from '@/components/ui/GlassCard';
import { Users, Clock, ShoppingBag, DollarSign, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ServiceList() {
    return (
        <GlassCard>
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-zinc-900">Top Services</h3>
                <MoreHorizontal className="w-5 h-5 text-zinc-400 cursor-pointer hover:text-zinc-600 transition-colors" />
            </div>
            <div className="space-y-4">
                <ServiceItem
                    name="General Wellness"
                    count={42}
                    trend="High Demand"
                    icon={Users}
                    color="text-purple-600"
                    bg="bg-purple-100"
                />
                <ServiceItem
                    name="Workspace Usage"
                    count={28}
                    trend="stable"
                    icon={Clock}
                    color="text-blue-600"
                    bg="bg-blue-100"
                />
                <ServiceItem
                    name="Luggage Storage"
                    count={15}
                    trend="-5%"
                    icon={ShoppingBag}
                    color="text-orange-600"
                    bg="bg-orange-100"
                />
                <ServiceItem
                    name="Concierge Consult"
                    count={9}
                    trend="+12%"
                    icon={DollarSign}
                    color="text-emerald-600"
                    bg="bg-emerald-100"
                />
            </div>
        </GlassCard>
    );
}

function ServiceItem({ name, count, trend, icon: Icon, color, bg }: any) {
    return (
        <div className="flex items-center justify-between group cursor-pointer p-2 rounded-xl hover:bg-zinc-50 transition-colors">
            <div className="flex items-center gap-4">
                <div className={cn("p-3 rounded-xl transition-transform group-hover:scale-110", bg)}>
                    <Icon className={cn("w-5 h-5", color)} />
                </div>
                <div>
                    <h4 className="text-sm font-medium text-zinc-900">{name}</h4>
                    <p className="text-xs text-zinc-500">{count} bookings this week</p>
                </div>
            </div>
            <span className="text-xs font-bold text-secondary bg-emerald-50 text-emerald-600 px-2 py-1 rounded-full uppercase tracking-wider">
                {trend}
            </span>
        </div>
    )
}
