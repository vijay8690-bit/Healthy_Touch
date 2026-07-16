import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import NotificationDropdown from '@/components/NotificationDropdown';
import { useNotificationCount } from '@/hooks/useNotificationCount';

interface AdminNavbarProps {
  userName?: string;
}

export default function AdminNavbar({ userName = 'Admin' }: AdminNavbarProps) {
  const { count: notificationCount } = useNotificationCount();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-4 sm:px-6 lg:ml-64">
      <div className="flex flex-1 items-center justify-between">
        {/* Page Title - Hidden on mobile, shown on larger screens */}
        <div className="hidden sm:block">
          <h1 className="text-xl font-semibold">Admin Dashboard</h1>
          <p className="text-sm text-muted-foreground">Manage your platform</p>
        </div>

        {/* Right side - Notifications & User */}
        <div className="ml-auto flex items-center gap-4">
          {/* Notifications */}
          <NotificationDropdown />

          {/* User Avatar */}
          <div className="flex items-center gap-2">
            <div className="hidden sm:block text-right">
              <p className="text-sm font-medium">{userName}</p>
              <p className="text-xs text-muted-foreground">Administrator</p>
            </div>
            <div className="h-9 w-9 rounded-full bg-primary flex items-center justify-center">
              <span className="text-white font-semibold text-sm">
                {userName?.charAt(0).toUpperCase()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
