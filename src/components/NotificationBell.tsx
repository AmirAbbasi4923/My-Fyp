import { useState, useEffect } from 'react';
import { Bell, Check, Trash2, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { toast } from 'sonner';

interface Notification {
    id: string;
    title: string;
    message: string;
    type: string;
    is_read: boolean;
    created_at: string;
}

const NotificationBell = () => {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        if (!user) return;

        fetchNotifications();

        // Subscribe to new notifications
        const channel = supabase
            .channel(`notifications_${user.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${user.id}`,
                },
                (payload) => {
                    setNotifications(prev => [payload.new as Notification, ...prev]);
                    setUnreadCount(prev => prev + 1);
                    toast.info((payload.new as Notification).title, {
                        description: (payload.new as Notification).message,
                    });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user]);

    const fetchNotifications = async () => {
        if (!user) return;
        // @ts-ignore
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (!error && data) {
            setNotifications(data as Notification[]);
            setUnreadCount((data as Notification[]).filter(n => !n.is_read).length);
        }
    };

    const markAsRead = async (id: string) => {
        // @ts-ignore
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', id);

        if (!error) {
            setNotifications(prev =>
                prev.map(n => n.id === id ? { ...n, is_read: true } : n)
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
        }
    };

    const markAllAsRead = async () => {
        // @ts-ignore
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('user_id', user?.id)
            .eq('is_read', false);

        if (!error) {
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            setUnreadCount(0);
        }
    };

    const deleteNotification = async (id: string) => {
        // @ts-ignore
        const { error } = await supabase
            .from('notifications')
            .delete()
            .eq('id', id);

        if (!error) {
            setNotifications(prev => prev.filter(n => n.id !== id));
            const notif = notifications.find(n => n.id === id);
            if (notif && !notif.is_read) {
                setUnreadCount(prev => Math.max(0, prev - 1));
            }
        }
    };

    const clearAll = async () => {
        // @ts-ignore
        const { error } = await supabase
            .from('notifications')
            .delete()
            .eq('user_id', user?.id);

        if (!error) {
            setNotifications([]);
            setUnreadCount(0);
        }
    };

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        return date.toLocaleDateString();
    };

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative hover:bg-primary/5 transition-colors">
                    <Bell className="w-6 h-6 text-gray-600" />
                    {unreadCount > 0 && (
                        <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white animate-in zoom-in duration-300">
                            {unreadCount}
                        </span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0 shadow-2xl border-gray-100 rounded-xl overflow-hidden" align="end">
                <div className="p-4 bg-primary/5 border-b border-primary/10 flex items-center justify-between">
                    <h3 className="font-bold text-sm text-primary flex items-center gap-2">
                        Notifications
                        {unreadCount > 0 && <Badge variant="secondary" className="bg-primary/10 text-primary border-none text-[10px]">{unreadCount} New</Badge>}
                    </h3>
                    {notifications.length > 0 && (
                        <div className="flex gap-2">
                            <Button variant="ghost" size="sm" className="h-7 text-[10px] px-2 font-bold uppercase tracking-tight text-gray-500 hover:text-primary" onClick={markAllAsRead}>
                                Read All
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 text-[10px] px-2 font-bold uppercase tracking-tight text-red-500 hover:bg-red-50" onClick={clearAll}>
                                Clear
                            </Button>
                        </div>
                    )}
                </div>

                <ScrollArea className="h-80">
                    {notifications.length > 0 ? (
                        <div className="flex flex-col">
                            {notifications.map((notif) => (
                                <div
                                    key={notif.id}
                                    className={`p-4 border-b border-gray-50 transition-colors relative group ${!notif.is_read ? 'bg-blue-50/30' : 'hover:bg-gray-50'}`}
                                >
                                    <div className="flex justify-between items-start gap-3">
                                        <div className="flex-1">
                                            <p className={`text-xs font-bold leading-none mb-1 ${!notif.is_read ? 'text-primary' : 'text-gray-700'}`}>
                                                {notif.title}
                                            </p>
                                            <p className="text-[11px] text-gray-500 leading-relaxed pr-6">
                                                {notif.message}
                                            </p>
                                            <div className="flex items-center gap-1 mt-2 text-[9px] text-gray-400 font-bold uppercase">
                                                <Clock className="w-3 h-3" /> {formatTime(notif.created_at)}
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity absolute right-2 top-2">
                                            {!notif.is_read && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="w-6 h-6 rounded-full hover:bg-green-50 hover:text-green-600"
                                                    onClick={() => markAsRead(notif.id)}
                                                >
                                                    <Check className="w-3.5 h-3.5" />
                                                </Button>
                                            )}
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="w-6 h-6 rounded-full hover:bg-red-50 hover:text-red-500 text-gray-300"
                                                onClick={() => deleteNotification(notif.id)}
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                            <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                                <Bell className="w-6 h-6 text-gray-300" />
                            </div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">No notifications yet</p>
                            <p className="text-[10px] text-gray-400 mt-1 max-w-[200px]">Updates about your appointments will appear here.</p>
                        </div>
                    )}
                </ScrollArea>

                <div className="p-3 bg-gray-50 border-t border-gray-100 text-center">
                    <p className="text-[9px] text-gray-400 font-bold uppercase tracking-tighter">Powered by Asaan Zindagi Realtime</p>
                </div>
            </PopoverContent>
        </Popover>
    );
};

export default NotificationBell;
