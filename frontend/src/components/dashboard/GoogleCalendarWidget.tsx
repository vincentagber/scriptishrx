'use client';

import { useState, useEffect } from 'react';
import { Calendar, ChevronRight, RefreshCw, CalendarCheck, Loader2, ArrowRight } from 'lucide-react';
import api from '@/lib/api';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';

interface CalendarEvent {
    id: string;
    summary: string;
    start: { dateTime?: string; date?: string };
    end: { dateTime?: string; date?: string };
    htmlLink: string;
}

export function GoogleCalendarWidget() {
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchEvents = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const { data } = await api.get('/calendar/events');
            if (data.connected) {
                setIsConnected(true);
                setEvents(data.events || []);
            } else {
                setIsConnected(false);
            }
        } catch (err: any) {
            console.error('Failed to fetch calendar:', err);
            // 401 means not connected/token invalid
            if (err.response?.status === 401) {
                setIsConnected(false);
            } else {
                // If 500 but because of not connected, generic fallback
                setError('Could not load calendar data');
            }
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchEvents();
        // Poll every 5 minutes for "real-time" updates
        const interval = setInterval(fetchEvents, 300000);
        return () => clearInterval(interval);
    }, []);

    const handleConnect = async () => {
        try {
            const { data } = await api.get('/auth/google');
            if (data.url) {
                window.location.href = data.url;
            }
        } catch (e) {
            console.error('Failed to start auth:', e);
            setError('Failed to initiate connection');
        }
    };

    const formatDate = (dateObj: { dateTime?: string; date?: string }) => {
        const dateStr = dateObj.dateTime || dateObj.date;
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    };

    return (
        <div className="bg-white/70 backdrop-blur-xl rounded-3xl p-6 border border-white/50 shadow-sm relative overflow-hidden group">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 rounded-xl text-blue-600">
                        <Calendar className="w-5 h-5" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">Upcoming Events</h3>
                </div>
                {isConnected && (
                    <button
                        onClick={fetchEvents}
                        disabled={isLoading}
                        className="text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                )}
            </div>

            <div className="min-h-[200px] flex flex-col">
                {isLoading ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                        <Loader2 className="w-8 h-8 animate-spin mb-2 text-blue-500" />
                        <span className="text-xs font-semibold">Syncing Calendar...</span>
                    </div>
                ) : !isConnected ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                        <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                            <CalendarCheck className="w-8 h-8 text-blue-500" />
                        </div>
                        <h4 className="text-slate-900 font-bold mb-2">Connect Google Calendar</h4>
                        <p className="text-slate-500 text-xs mb-6 max-w-[200px]">
                            Sync your schedule and never miss a meeting directly from your dashboard.
                        </p>
                        <Button onClick={handleConnect} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 rounded-xl flex items-center justify-center gap-2">
                            Connect Now <ArrowRight className="w-4 h-4" />
                        </Button>
                    </div>
                ) : events.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                        <Calendar className="w-12 h-12 mb-2 opacity-20" />
                        <p className="text-sm font-semibold">No upcoming events found</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {events.map((event) => (
                            <a
                                key={event.id}
                                href={event.htmlLink}
                                target="_blank"
                                rel="noreferrer"
                                className="block group/event relative pl-4 border-l-2 border-slate-200 hover:border-blue-500 transition-colors"
                            >
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h5 className="font-bold text-slate-800 text-sm group-hover/event:text-blue-600 transition-colors line-clamp-1">
                                            {event.summary || 'No Title'}
                                        </h5>
                                        <p className="text-xs text-slate-500 font-medium mt-1">
                                            {formatDate(event.start)}
                                        </p>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover/event:text-blue-500 transition-colors opacity-0 group-hover/event:opacity-100" />
                                </div>
                            </a>
                        ))}
                    </div>
                )}
            </div>

            {/* View Full Calendar Link */}
            {isConnected && events.length > 0 && (
                <div className="mt-6 pt-4 border-t border-slate-100/50 flex justify-center">
                    <a
                        href="https://calendar.google.com"
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                    >
                        View Full Calendar <ChevronRight className="w-3 h-3" />
                    </a>
                </div>
            )}
        </div>
    );
}
