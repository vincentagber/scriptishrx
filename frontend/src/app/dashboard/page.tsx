'use client';

import { useState, useEffect } from 'react';
import { Users, DollarSign, Clock, Activity, RefreshCw, Calendar, Zap, ArrowUpRight, ArrowDownRight, Phone } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { useDashboardStats } from '@/hooks/useDashboardData';
import { StatCard } from '@/components/dashboard/StatCard';
import { RecentBookings } from '@/components/dashboard/RecentBookings';
import { RevenueChart } from '@/components/dashboard/RevenueChart';
import { ServiceList } from '@/components/dashboard/ServiceList';

export default function DashboardPage() {
    // Polling enabled via useDashboardData hook update
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
        <div className="min-h-screen text-slate-800 p-4 md:p-8 space-y-8 relative overflow-hidden">
            {/* Background Atmosphere */}
            <div className="fixed inset-0 pointer-events-none z-[-1]">
                <div className="absolute top-[-10%] left-[-10%] w-[40rem] h-[40rem] bg-blue-400/20 rounded-full blur-[100px] opacity-50" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40rem] h-[40rem] bg-purple-400/20 rounded-full blur-[100px] opacity-50" />
            </div>

            {/* Header Section */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 backdrop-blur-sm bg-white/30 p-6 rounded-2xl border border-white/50 shadow-sm">
                <div>
                    <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700">
                        {greeting}, <span className="font-light">Admin</span>
                    </h1>
                    <div className="flex items-center gap-3 mt-2">
                        <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                        </span>
                        <p className="text-slate-600 font-medium text-sm">
                            System Live • <span className="text-slate-500 font-normal"> Monitoring Real-time Operations</span>
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="hidden md:flex flex-col items-end px-4">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Today</span>
                        <span className="text-sm font-semibold text-slate-700">{currentDate}</span>
                    </div>
                    <Button
                        size="sm"
                        onClick={handleRefresh}
                        className={cn(
                            "h-10 px-4 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-sm transition-all duration-200",
                            isRefetching && "opacity-80"
                        )}
                    >
                        <RefreshCw className={cn("w-4 h-4 mr-2", isRefetching && "animate-spin")} />
                        {isRefetching ? 'Syncing...' : 'Sync Data'}
                    </Button>
                </div>
            </div>

            {/* Stats Grid - Glassmorphism */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <GlassStatCard
                    title="Voice Interactions"
                    value={stats?.voiceInteractions?.toLocaleString() || '0'}
                    trend="+12%"
                    trendUp={true}
                    icon={Phone}
                    gradient="from-blue-500 to-indigo-600"
                    delay={0}
                />
                <GlassStatCard
                    title="Total Revenue"
                    value={`$${stats?.revenue?.toLocaleString() || '0'}`}
                    trend="+8.2%"
                    trendUp={true}
                    icon={DollarSign}
                    gradient="from-emerald-500 to-teal-600"
                    delay={100}
                />
                <GlassStatCard
                    title="Active Users"
                    value={stats?.totalClients?.toLocaleString() || '0'}
                    trend="+24%"
                    trendUp={true}
                    icon={Users}
                    gradient="from-violet-500 to-purple-600"
                    delay={200}
                />
                <GlassStatCard
                    title="Pending Bookings"
                    value={stats?.bookingsCount?.toLocaleString() || '0'}
                    trend="-2%"
                    trendUp={false}
                    icon={Clock}
                    gradient="from-orange-500 to-amber-600"
                    delay={300}
                />
            </div>

            {/* Main Content Split */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Chart Section - Takes 2 columns */}
                <div className="lg:col-span-2 bg-white/70 backdrop-blur-md rounded-2xl p-6 border border-white/50 shadow-sm relative overflow-hidden group hover:shadow-md transition-all duration-300">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <RevenueChart />
                </div>

                {/* Service List - Takes 1 column */}
                <div className="bg-white/70 backdrop-blur-md rounded-2xl p-6 border border-white/50 shadow-sm h-full relative overflow-hidden group hover:shadow-md transition-all duration-300">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-teal-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <ServiceList />
                </div>
            </div>

            {/* Recent Bookings Table */}
            <div className="bg-white/70 backdrop-blur-md rounded-2xl border border-white/50 shadow-sm overflow-hidden hover:shadow-md transition-all duration-300">
                <RecentBookings />
            </div>
        </div>
    );
}

// Internal Glass Component for this page
function GlassStatCard({ title, value, trend, trendUp, icon: Icon, gradient, delay }: any) {
    return (
        <div
            className="relative bg-white/60 backdrop-blur-xl rounded-2xl p-6 border border-white/40 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group overflow-hidden"
            style={{ animationDelay: `${delay}ms` }}
        >
            <div className={`absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity`}>
                <Icon className="w-24 h-24 text-slate-900" />
            </div>

            <div className="relative z-10">
                <div className="flex justify-between items-start mb-4">
                    <div className={`p-3 rounded-xl bg-gradient-to-br ${gradient} text-white shadow-md group-hover:scale-110 transition-transform duration-300`}>
                        <Icon className="w-6 h-6" />
                    </div>
                    {trend && (
                        <div className={cn(
                            "flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full border",
                            trendUp
                                ? "text-emerald-600 bg-emerald-50 border-emerald-100"
                                : "text-rose-600 bg-rose-50 border-rose-100"
                        )}>
                            {trendUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                            {trend}
                        </div>
                    )}
                </div>

                <div>
                    <h3 className="text-slate-500 text-sm font-semibold uppercase tracking-wider mb-1">{title}</h3>
                    <p className="text-3xl font-bold text-slate-800 tracking-tight">{value}</p>
                </div>
            </div>
        </div>
    );
}
