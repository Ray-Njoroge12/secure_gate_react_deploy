// client/src/components/ui/BottomNav.jsx
// Mobile bottom navigation bar - Industry standard pattern (Glovo, Uber, Instagram)
import React, { useMemo } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  Home, 
  UserPlus, 
  Clock, 
  Settings, 
  QrCode, 
  Search, 
  ClipboardList,
  Users,
  BarChart3,
  Shield
} from 'lucide-react';

/**
 * BottomNav - Mobile bottom navigation bar
 * Shows on screens < 768px (md breakpoint)
 * 
 * @param {string} role - 'resident' | 'guard' | 'admin'
 * @param {number} notificationCount - Badge count for alerts (optional)
 * @param {string} className - Additional CSS classes
 */
const BottomNav = ({ role, notificationCount = 0, className = '' }) => {
  const location = useLocation();

  // Navigation configurations per role
  const navigationConfig = useMemo(() => ({
    resident: [
      { 
        path: '/dashboard/resident', 
        label: 'Home', 
        icon: Home,
        exact: true 
      },
      { 
        path: '/resident/quick-invite', 
        label: 'Invite', 
        icon: UserPlus,
        highlight: true // Primary action - slightly larger
      },
      { 
        path: '/resident/visitor-history', 
        label: 'History', 
        icon: Clock 
      },
      { 
        path: '/resident/settings', 
        label: 'Settings', 
        icon: Settings 
      },
    ],
    guard: [
      { 
        path: '/dashboard/guard', 
        label: 'Home', 
        icon: Home,
        exact: true 
      },
      { 
        path: '/dashboard/guard/scan-qr', 
        label: 'Scan', 
        icon: QrCode,
        highlight: true // Primary action
      },
      { 
        path: '/dashboard/guard/manual-check', 
        label: 'Check', 
        icon: Search 
      },
      { 
        path: '/dashboard/guard/visitor-history', 
        label: 'History', 
        icon: ClipboardList 
      },
    ],
    admin: [
      { 
        path: '/dashboard/admin', 
        label: 'Home', 
        icon: Home,
        exact: true 
      },
      { 
        path: '/dashboard/admin/users', 
        label: 'Users', 
        icon: Users 
      },
      { 
        path: '/dashboard/admin/reports', 
        label: 'Reports', 
        icon: BarChart3 
      },
      { 
        path: '/dashboard/admin/settings', 
        label: 'Settings', 
        icon: Settings 
      },
    ],
  }), []);

  const navigation = navigationConfig[role] || [];

  // Check if a path is active
  const isActive = (path, exact) => {
    if (exact) {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  if (navigation.length === 0) return null;

  return (
    <nav 
      className={`
        fixed bottom-0 left-0 right-0 z-50
        bg-white border-t border-gray-200
        md:hidden
        safe-area-pb
        ${className}
      `}
      aria-label="Bottom navigation"
    >
      <div className="flex items-center justify-around h-16 px-2">
        {navigation.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path, item.exact);
          
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`
                flex flex-col items-center justify-center
                min-w-[64px] min-h-[48px] px-2 py-1
                rounded-lg transition-all duration-200
                ${item.highlight ? 'relative' : ''}
                ${active 
                  ? 'text-green-600' 
                  : 'text-gray-500 dark:text-gray-300 hover:text-gray-700 hover:bg-gray-50'
                }
              `}
              aria-label={item.label}
              aria-current={active ? 'page' : undefined}
            >
              {/* Highlight ring for primary action */}
              {item.highlight && (
                <div className={`
                  absolute -top-2 left-1/2 -translate-x-1/2
                  w-12 h-12 rounded-full
                  ${active 
                    ? 'bg-green-100 border-2 border-green-500' 
                    : 'bg-gray-100 border-2 border-gray-200'
                  }
                  -z-10
                `} />
              )}
              
              <Icon 
                className={`
                  ${item.highlight ? 'w-6 h-6' : 'w-5 h-5'}
                  ${active ? 'stroke-[2.5px]' : 'stroke-[2px]'}
                `} 
              />
              <span className={`
                text-xs mt-1 font-medium
                ${active ? 'font-semibold' : ''}
              `}>
                {item.label}
              </span>
              
              {/* Notification badge */}
              {item.path.includes('dashboard') && notificationCount > 0 && (
                <span className="
                  absolute -top-1 -right-1
                  min-w-[18px] h-[18px] px-1
                  bg-red-500 text-white text-xs font-bold
                  rounded-full flex items-center justify-center
                ">
                  {notificationCount > 99 ? '99+' : notificationCount}
                </span>
              )}
            </NavLink>
          );
        })}
      </div>
      
      {/* Safe area spacer for iOS */}
      <div className="h-safe-area-inset-bottom bg-white" />
    </nav>
  );
};

export default BottomNav;
