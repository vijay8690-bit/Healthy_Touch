import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Bell, Clock, Calendar, CreditCard, Users, UserCheck, Settings } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { notificationService, type Notification } from '@/services/notification.service';
import { TOKEN_KEY } from '@/config/api.config';

interface NotificationDropdownProps {
  className?: string;
}

export default function NotificationDropdown({ className = '' }: NotificationDropdownProps) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasNewNotifications, setHasNewNotifications] = useState(false);
  const location = useLocation();
  const hasAuthToken = Boolean(localStorage.getItem(TOKEN_KEY));

  // Determine which notifications to show based on current route
  const getFilterType = () => {
    const path = location.pathname;
    if (path.includes('/users')) return 'user';
    if (path.includes('/provider')) return 'provider';
    if (path.includes('/payment')) return 'payment';
    if (path.includes('/appointment')) return 'appointment';
    if (path.includes('/notification')) return 'all';
    return 'all'; // Dashboard shows all
  };

  // Filter notifications based on type
  const filterNotifications = (notifs: Notification[]) => {
    const filterType = getFilterType();
    if (filterType === 'all') return notifs;
    
    return notifs.filter(notif => {
      const type = notif.type.toLowerCase();
      switch (filterType) {
        case 'user':
          return type.includes('user') || type.includes('registration');
        case 'provider':
          return type.includes('provider') || type.includes('approval') || type.includes('doctor') || type.includes('nurse') || type.includes('appointment');
        case 'payment':
          return type.includes('payment') || type.includes('transaction');
        case 'appointment':
          return type.includes('appointment') || type.includes('booking');
        default:
          return true;
      }
    });
  };

  const fetchNotifications = async () => {
    if (!hasAuthToken) {
      setNotifications([]);
      setHasNewNotifications(false);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await notificationService.getMyNotifications({ limit: 20 });
      setNotifications(response.notifications);
      
      // Check if there are any unread notifications
      const unread = response.notifications.some(n => !n.readBy.length);
      setHasNewNotifications(unread);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!hasAuthToken) return;

    fetchNotifications();
    
    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [hasAuthToken]);

  const handleMarkAsRead = async (id: string) => {
    if (!hasAuthToken) return;

    try {
      await notificationService.markAsRead(id);
      // Update local state
      setNotifications(prev => 
        prev.map(n => 
          n._id === id 
            ? { ...n, readBy: [...n.readBy, { userId: 'current', readAt: new Date() }] }
            : n
        )
      );
      fetchNotifications(); // Refresh to get updated count
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes('user') || t.includes('registration')) return Users;
    if (t.includes('provider') || t.includes('approval') || t.includes('doctor')) return UserCheck;
    if (t.includes('payment') || t.includes('transaction')) return CreditCard;
    if (t.includes('appointment') || t.includes('booking')) return Calendar;
    return Settings;
  };

  const getNotificationColor = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes('user') || t.includes('registration')) return 'bg-purple-500/10 text-purple-500';
    if (t.includes('provider') || t.includes('approval')) return 'bg-blue-500/10 text-blue-500';
    if (t.includes('payment')) return 'bg-amber-500/10 text-amber-500';
    if (t.includes('appointment')) return 'bg-green-500/10 text-green-500';
    return 'bg-gray-500/10 text-gray-500';
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  const filteredNotifications = filterNotifications(notifications);
  const unreadCount = filteredNotifications.filter(n => !n.readBy.length).length;

  if (!hasAuthToken) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button 
          className={`p-2 rounded-xl bg-muted hover:bg-muted/80 transition-all relative ${className}`}
        >
          <Bell className="w-5 h-5" />
          {/* Red dot with pulse animation for unread - NO NUMBER */}
          {hasNewNotifications && (
            <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0 mr-4" align="end">
        <div className="p-4 border-b border-border bg-muted/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-lg">Notifications</h3>
              {unreadCount > 0 && (
                <Badge className="bg-green-500 hover:bg-green-600 text-white">
                  {unreadCount} New
                </Badge>
              )}
            </div>
          </div>
        </div>
        
        <div className="max-h-[26rem] overflow-y-auto">
          {loading ? (
            <div className="p-12 text-center text-muted-foreground">
              <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
              <p className="mt-2 text-sm">Loading...</p>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                <Bell className="w-8 h-8 opacity-50" />
              </div>
              <p className="font-semibold text-sm mb-1">No notifications</p>
              <p className="text-xs">You're all caught up!</p>
            </div>
          ) : (
            filteredNotifications.map((notification) => {
              const Icon = getNotificationIcon(notification.type);
              const isUnread = notification.readBy.length === 0;
              
              return (
                <div
                  key={notification._id}
                  onClick={() => isUnread && handleMarkAsRead(notification._id)}
                  className={`p-4 border-b border-border hover:bg-muted/50 transition-colors cursor-pointer ${
                    isUnread ? 'bg-blue-50 dark:bg-blue-950/20' : ''
                  }`}
                >
                  <div className="flex gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                      getNotificationColor(notification.type)
                    }`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium text-sm leading-tight">{notification.title}</p>
                        {isUnread && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {getTimeAgo(notification.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
