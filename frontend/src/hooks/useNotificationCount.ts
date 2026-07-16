import { useState, useEffect } from 'react';
import { notificationService } from '@/services/notification.service';
import { TOKEN_KEY } from '@/config/api.config';

const hasAuthToken = () => Boolean(localStorage.getItem(TOKEN_KEY));

export function useNotificationCount() {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchCount = async () => {
    if (!hasAuthToken()) {
      setCount(0);
      setLoading(false);
      return;
    }

    try {
      const unreadCount = await notificationService.getUnreadCount();
      setCount(unreadCount);
    } catch (error) {
      console.error('Failed to fetch notification count:', error);
      setCount(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!hasAuthToken()) {
      setCount(0);
      setLoading(false);
      return;
    }

    fetchCount();

    // Poll for updates every 30 seconds
    const interval = setInterval(fetchCount, 30000);

    return () => clearInterval(interval);
  }, []);

  return { count, loading, refetch: fetchCount };
}
