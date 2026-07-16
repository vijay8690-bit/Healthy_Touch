import { useState, ReactNode } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { LogOut, Menu } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import NotificationDropdown from '../NotificationDropdown';

interface SidebarLink {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href: string;
}

interface DashboardLayoutProps {
  children: ReactNode;
  sidebarLinks: SidebarLink[];
  portalName: string;
  userName: string;
  userInitial: string;
  notificationCount?: number;
  statusBadge?: ReactNode;
}

export default function DashboardLayout({
  children,
  sidebarLinks,
  portalName,
  userName,
  userInitial,
  notificationCount = 0,
  statusBadge,
}: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="dashboard-shell flex min-h-screen overflow-x-hidden">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`dashboard-sidebar fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 lg:transform-none ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-4 border-b border-border">
            <Link to="/" className="flex items-center gap-2">
              {/* <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-md">
                <Heart className="w-5 h-5 text-primary-foreground" />
              </div>
              <div className="flex flex-col">
                <span className="font-display font-bold text-lg leading-tight">Healthy Touch</span>
                <span className="text-[10px] text-muted-foreground -mt-0.5">{portalName}</span>
              </div> */}
              <img src="/healthy-touch-logo.png" className='h-16' alt="" />
            </Link>
          </div>

          {/* Navigation */}
          <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto p-4">
            {sidebarLinks.map((link) => {
              const isActive = location.pathname === link.href;
              return (
                <Link
                  key={link.href}
                  to={link.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-primary to-health-blue-deep text-primary-foreground shadow-md'
                      : 'text-muted-foreground hover:bg-accent/70 hover:text-foreground'
                  }`}
                >
                  <link.icon className="w-5 h-5" />
                  <span className="font-medium">{link.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Status Badge */}
          {statusBadge && (
            <div className="px-4 mb-4">
              {statusBadge}
            </div>
          )}

          {/* Logout */}
          {isAuthenticated && (
          <div className="p-4 border-t border-border">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">Logout</span>
            </button>
          </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex min-h-screen min-w-0 flex-1 flex-col lg:ml-64">
        {/* Header */}
        <header className="dashboard-header sticky top-0 z-30 px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3 sm:gap-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-lg hover:bg-muted transition-colors"
              >
                <Menu className="w-6 h-6" />
              </button>
              <div className="min-w-0">
                <h1 className="break-anywhere font-display text-base font-semibold sm:text-lg">{portalName}</h1>
                <p className="break-anywhere text-xs text-muted-foreground sm:text-sm">Welcome, {userName}!</p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              
              {isAuthenticated && <NotificationDropdown />}
              {/* <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-primary-foreground font-bold">
                {userInitial}
              </div> */}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="min-w-0 flex-1 space-y-6 p-3 sm:p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
