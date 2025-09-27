import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  LayoutDashboard, 
  Cpu, 
  BarChart3, 
  Settings, 
  Menu, 
  X, 
  Droplets, 
  Bell, 
  User, 
  LogOut, 
  FileText, 
  SlidersHorizontal, 
  Users as UsersIcon, 
  ActivitySquare, 
  ShieldCheck, 
  Sun, 
  Moon, 
  Loader2, 
  BookOpen, 
  AlertCircle, 
  Briefcase, 
  UserPlus 
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, updateUserPreferences, preferences, loading: authLoading } = useAuth();
  const { alerts } = useData();

  const commonNavigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Devices', href: '/devices', icon: Cpu },
    { name: 'Live Sensors', href: '/realtime-sensors', icon: ActivitySquare },
    { name: 'Analytics', href: '/analytics', icon: BarChart3 },
    { name: 'Calibration', href: '/calibration', icon: SlidersHorizontal },
    { name: 'Alert Rules', href: '/alert-rules', icon: AlertCircle },
  ];

  const adminNavigation = [
    { name: 'User Management', href: '/user-management', icon: UsersIcon },
    { name: 'Audit Logs', href: '/audit-logs', icon: FileText },
    { name: 'System Admin', href: '/system-admin', icon: ShieldCheck },
    { name: 'Alert Templates', href: '/alert-templates', icon: FileText },
    { name: 'Organization Invites', href: '/organization-invites', icon: UserPlus },
  ];
  
  const bottomNavigation = [
    { name: 'Export Data', href: '/export-data', icon: FileText },
    { name: 'API Docs', href: '/api-docs', icon: BookOpen },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];
  
  let navigation = [
    ...commonNavigation,
    ...(user?.role === 'admin' ? adminNavigation : []),
    ...bottomNavigation
  ];
  
  if (user?.organization && user?.role === 'admin') { 
     const hasOrgSettings = navigation.some(item => item.href === '/organization-settings');
     if (!hasOrgSettings) {
        navigation.splice(commonNavigation.length, 0, { name: 'My Organization', href: '/organization-settings', icon: Briefcase });
     }
  }

  const unreadAlerts = alerts.filter(alert => !alert.resolved && alert.status !== 'resolved').length;

  const handleLogout = async () => {
    await logout();
    toast({ title: "Logged Out", description: "You have been successfully logged out." });
    navigate('/login');
  };
  
  const currentTheme = preferences?.theme || 'dark';

  const toggleTheme = async () => {
    if (authLoading || !preferences) return; 
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    await updateUserPreferences({ theme: newTheme });
     toast({ title: "Theme Changed", description: `Switched to ${newTheme} mode.` });
  };

  if (authLoading && !preferences) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <Loader2 className="h-12 w-12 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex ${currentTheme === 'dark' ? 'bg-slate-900 text-white' : 'bg-gray-100 text-gray-900'}`}>
      <motion.div
        initial={{ x: sidebarOpen ? 0 : -300 }}
        animate={{ x: sidebarOpen ? 0 : -300 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className={`fixed inset-y-0 left-0 z-50 w-64 ${currentTheme === 'dark' ? 'bg-slate-900/95 border-slate-700' : 'bg-white border-gray-200'} backdrop-blur-xl border-r lg:translate-x-0 lg:static lg:inset-0 flex flex-col shadow-lg`}
      >
        <div className={`flex items-center justify-between h-16 px-6 border-b ${currentTheme === 'dark' ? 'border-slate-700' : 'border-gray-200'}`}>
          <Link to="/" className="flex items-center space-x-2">
            <Droplets className="h-8 w-8 text-blue-500" />
            <span className={`text-xl font-bold ${currentTheme === 'dark' ? 'text-white' : 'text-gray-800'}`}>HydroScan</span>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(false)}
            className={`lg:hidden ${currentTheme === 'dark' ? 'text-slate-300 hover:text-white' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <nav className="mt-8 px-4 flex-1 overflow-y-auto scrollbar-hide">
          <div className="space-y-2">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href || (item.href !== "/" && location.pathname.startsWith(item.href));
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ease-in-out transform hover:scale-105 ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md'
                      : `${currentTheme === 'dark' ? 'text-slate-300 hover:bg-slate-800 hover:text-white' : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'}`
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon className={`mr-3 h-5 w-5 ${isActive ? 'text-white' : (currentTheme === 'dark' ? 'text-slate-400 group-hover:text-white' : 'text-gray-500 group-hover:text-gray-700')}`} />
                  {item.name}
                </Link>
              );
            })}
          </div>
        </nav>

        <div className={`p-4 border-t ${currentTheme === 'dark' ? 'border-slate-700' : 'border-gray-200'}`}>
           <div className="mb-2">
            <p className={`text-xs ${currentTheme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>Org: {user?.organization?.name || 'N/A'}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            disabled={authLoading}
            className={`w-full justify-start mb-2 ${currentTheme === 'dark' ? 'text-slate-300 hover:bg-slate-700 hover:text-yellow-400' : 'text-gray-600 hover:bg-gray-200 hover:text-indigo-600'} transition-colors`}
          >
            {currentTheme === 'dark' ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
            Switch to {currentTheme === 'dark' ? 'Light' : 'Dark'} Mode
          </Button>
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center ring-2 ring-slate-700">
              <User className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold ${currentTheme === 'dark' ? 'text-white' : 'text-gray-800'} truncate`}>
                {user?.user_metadata?.full_name || user?.full_name || user?.email || 'Guest'}
              </p>
              <p className={`text-xs ${currentTheme === 'dark' ? 'text-slate-400' : 'text-gray-500'} truncate`}>
                Role: {user?.role || 'User'}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            disabled={authLoading}
            className={`w-full justify-start ${currentTheme === 'dark' ? 'text-slate-300 hover:bg-red-500/20 hover:text-red-400' : 'text-gray-600 hover:bg-red-100 hover:text-red-600'} transition-colors`}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </Button>
        </div>
      </motion.div>

      <div className="flex-1 flex flex-col lg:ml-0">
        <header className={`${currentTheme === 'dark' ? 'bg-slate-900/80 border-slate-700' : 'bg-white/80 border-gray-200'} backdrop-blur-xl border-b h-16 flex items-center justify-between px-6 sticky top-0 z-40`}>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(true)}
            className={`lg:hidden ${currentTheme === 'dark' ? 'text-slate-300 hover:text-white' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex-1"></div> {/* Spacer */}

          <div className="flex items-center space-x-4">
            <div className="relative">
              <Button variant="ghost" size="icon" className={`${currentTheme === 'dark' ? 'text-slate-300 hover:text-white' : 'text-gray-500 hover:text-gray-700'}`}>
                <Bell className="h-5 w-5" />
                {unreadAlerts > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center bg-red-500 text-xs text-white animate-pulse">
                    {unreadAlerts}
                  </Badge>
                )}
              </Button>
            </div>
          </div>
        </header>

        <main className={`flex-1 overflow-auto scrollbar-hide ${currentTheme === 'dark' ? '' : 'bg-gray-50'}`}>
          {children}
        </main>
      </div>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-70 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default Layout;