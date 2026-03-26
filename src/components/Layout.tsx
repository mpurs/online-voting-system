import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Vote, LayoutDashboard, UserCircle, LogOut, ShieldCheck, Menu, X } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useAuth } from '@/src/components/AuthContext';
import { toast } from 'sonner';

interface LayoutProps {
  children: React.ReactNode;
  userRole?: 'student' | 'admin' | null;
}

export default function Layout({ children, userRole }: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out successfully');
      navigate('/login');
      setIsMobileMenuOpen(false);
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to log out');
    }
  };

  const isAdminEmail = user?.email === 'tumelomak0813@gmail.com';
  const effectiveRole = isAdminEmail ? 'admin' : userRole;

  const navItems = effectiveRole === 'admin' 
    ? [
        { name: 'Admin Dashboard', path: '/admin', icon: ShieldCheck },
        { name: 'Candidates', path: '/admin/candidates', icon: UserCircle },
      ]
    : effectiveRole === 'student'
    ? [
        { name: 'Vote', path: '/dashboard', icon: Vote },
        { name: 'Profile', path: '/profile', icon: UserCircle },
      ]
    : [];

  return (
    <div className="min-h-screen bg-neutral-50 font-sans text-neutral-900">
      <nav className="sticky top-0 z-50 border-b border-neutral-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-indigo-600 p-2 text-white">
                <Vote size={24} />
              </div>
              <span className="text-xl font-bold tracking-tight text-indigo-900">
                Makgolo <span className="font-light">Vote</span>
              </span>
            </div>

            {user && (
              <>
                <div className="hidden md:block">
                  <div className="flex items-center gap-4">
                    {navItems.map((item) => (
                      <Link
                        key={item.path}
                        to={item.path}
                        className={cn(
                          "flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors rounded-md",
                          location.pathname === item.path
                            ? "bg-indigo-50 text-indigo-700"
                            : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
                        )}
                      >
                        <item.icon size={18} />
                        {item.name}
                      </Link>
                    ))}
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-md transition-colors"
                    >
                      <LogOut size={18} />
                      Logout
                    </button>
                  </div>
                </div>

                <div className="md:hidden">
                  <button
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className="p-2 text-neutral-600 hover:bg-neutral-100 rounded-md"
                  >
                    {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Mobile Menu */}
        {user && isMobileMenuOpen && (
          <div className="md:hidden border-t border-neutral-200 bg-white p-4 space-y-2 animate-in slide-in-from-top duration-200">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 text-base font-medium transition-colors rounded-lg",
                  location.pathname === item.path
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-neutral-600 hover:bg-neutral-50"
                )}
              >
                <item.icon size={20} />
                {item.name}
              </Link>
            ))}
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 px-4 py-3 text-base font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut size={20} />
              Logout
            </button>
          </div>
        )}
      </nav>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>

      <footer className="border-t border-neutral-200 bg-white py-8">
        <div className="mx-auto max-w-7xl px-4 text-center text-sm text-neutral-500 sm:px-6 lg:px-8">
          <p>© 2026 Makgolo Online Voting System. Built for production.</p>
        </div>
      </footer>
    </div>
  );
}
