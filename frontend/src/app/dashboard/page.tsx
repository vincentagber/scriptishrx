'use client';

import { useState, useEffect } from 'react';
import { Users, DollarSign, Clock, Activity, RefreshCw, Calendar, Zap } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { useDashboardStats } from '@/hooks/useDashboardData';
import { StatCard } from '@/components/dashboard/StatCard';
import { RecentBookings } from '@/components/dashboard/RecentBookings';
import { RevenueChart } from '@/components/dashboard/RevenueChart';
import { ServiceList } from '@/components/dashboard/ServiceList';

export default function DashboardPage() {
    const { data: stats, isLoading, refetch, isRefetching } = useDashboardStats();
    const [greeting, setGreeting] = useState('');
    const [currentDate, setCurrentDate] = useState('');

    useEffect(() => {
        // Time-based Greeting
        const hour = new Date().getHours();
        if (hour < 12) setGreeting('Good Morning');
        else if (hour < 18) setGreeting('Good Afternoon');
        else setGreeting('Good Evening');

        // Current Date
        setCurrentDate(new Date().toLocaleDateString('en-US', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        }));
    }, []);

    const handleRefresh = async () => {
        await refetch();
    };

    return (
        <div className="min-h-screen text-black/90 p-4 md:p-8 space-y-8 relative">
            {/* Background Gradient */}
            <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary-start/20 via-background to-background z-[-1]" />

            {/* Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">
                        {greeting}, Admin
                    </h1>
                    <p className="text-zinc-500 mt-1 flex items-center gap-2 font-medium">
                        <Activity className="w-4 h-4 text-emerald-500 animate-pulse" />
                        System Online & Monitoring Real-time Operations
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <Button
                        size="sm"
                        onClick={handleRefresh}
                        className={cn("gap-2 bg-white/80 hover:bg-white border-zinc-200 text-zinc-600 shadow-sm", isRefetching && "animate-pulse")}
                    >
                        <RefreshCw className={cn("w-4 h-4", isRefetching && "animate-spin")} />
                        Refresh
                    </Button>
                    <div className="px-4 py-2 rounded-xl bg-white border border-zinc-200 flex items-center gap-2 text-zinc-600 shadow-sm">
                        <Calendar className="w-4 h-4 text-primary-start" />
                        <span className="text-sm font-medium">{currentDate}</span>
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Voice Interactions"
                    value={stats?.voiceInteractions?.toLocaleString() || '0'}
                    trend="+12%"
                    icon={Zap}
                    color="text-amber-500"
                    trendUp={true}
                />
                <StatCard
                    title="Total Revenue"
                    value={`$${stats?.revenue?.toLocaleString() || '0'}`}
                    trend="+8.2%"
                    icon={DollarSign}
                    color="text-emerald-500"
                    trendUp={true}
                />
                <StatCard
                    title="Active Users"
                    value={stats?.totalClients?.toLocaleString() || '0'}
                    trend="+24%"
                    icon={Users}
                    color="text-blue-500"
                    trendUp={true}
                />
                <StatCard
                    title="Pending Bookings"
                    value={stats?.bookingsCount?.toLocaleString() || '0'}
                    trend="-2%"
                    icon={Clock}
                    color="text-orange-500"
                    trendUp={false}
                />
            </div>

            {/* Main Content Split */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <RevenueChart />
                <ServiceList />
            </div>

            {/* Recent Bookings Table */}
            <RecentBookings />
        </div>
    );
}
