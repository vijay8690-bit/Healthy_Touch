import { Link } from 'react-router-dom';
import { ShieldX, Home, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

export default function Unauthorized() {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <ShieldX className="w-24 h-24 mx-auto text-destructive mb-4" />
          <h1 className="text-4xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground text-lg">
            You don't have permission to access this page.
          </p>
        </div>

        <div className="space-y-4">
          {user ? (
            <>
              <p className="text-sm text-muted-foreground">
                You are logged in as <strong>{user.name}</strong> ({user.role})
              </p>
              <div className="flex gap-3 justify-center">
                <Button onClick={() => window.history.back()} variant="outline">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Go Back
                </Button>
                <Button onClick={handleLogout} variant="destructive">
                  Logout
                </Button>
              </div>
            </>
          ) : (
            <Link to="/auth">
              <Button className="w-full">
                <Home className="w-4 h-4 mr-2" />
                Go to Login
              </Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
