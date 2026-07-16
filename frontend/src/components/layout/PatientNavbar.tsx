import NotificationDropdown from '@/components/NotificationDropdown';

interface PatientNavbarProps {
  userName?: string;
}

export default function PatientNavbar({ userName = 'User' }: PatientNavbarProps) {
  const displayName = userName?.trim() || 'User';

  return (
    <header className="dashboard-header sticky top-0 z-30 flex h-16 items-center gap-4 px-4 sm:px-6 lg:ml-64">
      <div className="flex flex-1 items-center justify-between">
        {/* Welcome Message */}
        <div className="hidden sm:block">
          <h1 className="text-xl font-semibold">{displayName}</h1>
          <p className="text-sm text-muted-foreground">Welcome back, {displayName}!</p>
        </div>

        {/* Right side - Notifications & User */}
        <div className="ml-auto flex items-center gap-4">
          {/* Notifications */}
          <NotificationDropdown />

          {/* User Avatar */}
          <div className="flex items-center gap-2">
            <div className="hidden sm:block text-right">
              <p className="text-sm font-medium">{displayName}</p>
              <p className="text-xs text-muted-foreground">Patient</p>
            </div>
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-sm">
              <span className="text-white font-semibold text-sm">
                {displayName.charAt(0).toUpperCase()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
