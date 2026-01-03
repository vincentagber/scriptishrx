'use client';

import { useState, useEffect, useCallback } from 'react';
import { Calendar, dateFnsLocalizer, Views, View } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { Loader2, Calendar as CalendarIcon, RefreshCw, ChevronLeft, ChevronRight, Plus, Check } from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

// Setup Localizer
const locales = {
    'en-US': enUS,
};

const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek,
    getDay,
    locales,
});

interface CalendarEvent {
    id: string;
    title: string;
    start: Date;
    end: Date;
    allDay?: boolean;
    resource?: any;
}

export function CalendarWidget() {
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isConnected, setIsConnected] = useState(false);
    const [view, setView] = useState<View>(Views.MONTH);
    const [date, setDate] = useState(new Date());

    const fetchEvents = useCallback(async () => {
        setIsLoading(true);
        try {
            const { data } = await api.get('/calendar/events');
            if (data.connected) {
                setIsConnected(true);
                const mappedEvents = (data.events || []).map((e: any) => ({
                    id: e.id,
                    title: e.summary || '(No Title)',
                    start: new Date(e.start.dateTime || e.start.date),
                    end: new Date(e.end.dateTime || e.end.date),
                    allDay: !e.start.dateTime, // If no exact time, it's all day
                    resource: e.htmlLink
                }));
                setEvents(mappedEvents);
            } else {
                setIsConnected(false);
            }
        } catch (err) {
            console.error('Failed to fetch calendar:', err);
            // Don't show error UI, just stay disconnected state or empty events
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchEvents();
        const interval = setInterval(fetchEvents, 300000); // 5 min poll
        return () => clearInterval(interval);
    }, [fetchEvents]);

    const handleConnect = async () => {
        try {
            const { data } = await api.get('/auth/google');
            if (data.url) {
                window.location.href = data.url;
            }
        } catch (e) {
            console.error('Failed to start auth:', e);
        }
    };

    const handleSelectEvent = (event: CalendarEvent) => {
        if (event.resource) {
            window.open(event.resource, '_blank');
        }
    };

    // Custom Toolbar
    const CustomToolbar = (toolbar: any) => {
        const goToBack = () => {
            toolbar.onNavigate('PREV');
        };

        const goToNext = () => {
            toolbar.onNavigate('NEXT');
        };

        const goToCurrent = () => {
            toolbar.onNavigate('TODAY');
        };

        const label = () => {
            const date = toolbar.date;
            return (
                <span className="text-lg font-bold text-slate-900 capitalize">
                    {format(date, 'MMMM yyyy')}
                </span>
            );
        };

        return (
            <div className="flex flex-col md:flex-row items-center justify-between mb-4 gap-4 p-2">
                <div className="flex items-center gap-4">
                    <div className="flex items-center bg-slate-100 rounded-lg p-1">
                        <button onClick={goToBack} className="p-1 hover:bg-white rounded-md transition-all text-slate-500 hover:text-slate-900 hover:shadow-sm">
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button onClick={goToCurrent} className="px-3 py-1 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-white rounded-md transition-all mx-1">
                            Today
                        </button>
                        <button onClick={goToNext} className="p-1 hover:bg-white rounded-md transition-all text-slate-500 hover:text-slate-900 hover:shadow-sm">
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                    {label()}
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex bg-slate-100 rounded-lg p-1">
                        {['month', 'week', 'day', 'agenda'].map((v) => (
                            <button
                                key={v}
                                onClick={() => toolbar.onView(v)}
                                className={cn(
                                    "px-3 py-1.5 text-xs font-bold rounded-md transition-all capitalize",
                                    toolbar.view === v
                                        ? "bg-white text-blue-600 shadow-sm"
                                        : "text-slate-500 hover:text-slate-900 hover:bg-slate-200/50"
                                )}
                            >
                                {v}
                            </button>
                        ))}
                    </div>

                    {/* Connect/Sync Button */}
                    {!isConnected ? (
                        <Button
                            onClick={handleConnect}
                            size="sm"
                            className="bg-slate-900 hover:bg-black text-white text-xs font-bold px-4 h-9"
                        >
                            <Plus className="w-3.5 h-3.5 mr-2" />
                            Sync Google
                        </Button>
                    ) : (
                        <Button
                            onClick={() => fetchEvents()}
                            variant="outline"
                            size="sm"
                            className="text-slate-500 border-slate-200 text-xs h-9 hover:bg-slate-50"
                            title="Sync Now"
                        >
                            <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} />
                        </Button>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="bg-white/70 backdrop-blur-xl rounded-3xl p-6 border border-white/50 shadow-sm h-[600px] flex flex-col">
            <Calendar
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                style={{ height: '100%' }}
                views={['month', 'week', 'day', 'agenda']}
                view={view}
                onView={setView}
                date={date}
                onNavigate={setDate}
                components={{
                    toolbar: CustomToolbar
                }}
                onSelectEvent={handleSelectEvent}
                eventPropGetter={(event) => ({
                    className: "bg-blue-500 border-0 rounded-md text-xs font-medium px-2 py-0.5"
                })}
            />
        </div>
    );
}

// Global styles for react-big-calendar overrides to match theme
// We can add this to global css, but for now we rely on standard styles and specific class overrides if needed.
