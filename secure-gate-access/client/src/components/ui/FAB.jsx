// client/src/components/ui/FAB.jsx
// Floating Action Button - Industry standard pattern (Gmail, Instagram)
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, X, UserPlus, QrCode, Users, FileText, AlertTriangle } from 'lucide-react';

/**
 * FAB - Floating Action Button
 * 
 * @param {string} role - 'resident' | 'guard' | 'admin' (auto-configures actions)
 * @param {function} onClick - Click handler for single action FAB
 * @param {Array} actions - Custom actions array [{icon, label, onClick, color}]
 * @param {ReactNode} icon - Custom icon (default: Plus)
 * @param {string} label - Accessibility label
 * @param {string} color - 'primary' | 'secondary' | 'danger'
 * @param {string} position - 'bottom-right' | 'bottom-center'
 * @param {boolean} extended - Show label next to icon
 * @param {boolean} mini - Smaller size
 * @param {boolean} hideOnScroll - Hide when scrolling down
 */
const FAB = ({
  role,
  onClick,
  actions: customActions,
  icon: CustomIcon,
  label = 'Quick action',
  color = 'primary',
  position = 'bottom-right',
  extended = false,
  extendedLabel,
  mini = false,
  className = '',
}) => {
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(false);

  // Role-based default actions
  const roleActions = {
    resident: [
      { 
        icon: UserPlus, 
        label: 'Quick Invite', 
        onClick: () => navigate('/resident/quick-invite'),
        color: 'primary'
      },
      { 
        icon: FileText, 
        label: 'Bulk Invite', 
        onClick: () => navigate('/resident/bulk-invite'),
        color: 'secondary'
      },
    ],
    guard: [
      { 
        icon: QrCode, 
        label: 'Scan QR', 
        onClick: () => navigate('/dashboard/guard/scan-qr'),
        color: 'primary'
      },
      { 
        icon: UserPlus, 
        label: 'Walk-in', 
        onClick: () => navigate('/dashboard/guard/walk-in'),
        color: 'secondary'
      },
      { 
        icon: AlertTriangle, 
        label: 'Report Incident', 
        onClick: () => navigate('/dashboard/guard/incidents'),
        color: 'danger'
      },
    ],
    admin: [
      { 
        icon: Users, 
        label: 'Add User', 
        onClick: () => navigate('/dashboard/admin/users'),
        color: 'primary'
      },
      { 
        icon: FileText, 
        label: 'Generate Report', 
        onClick: () => navigate('/dashboard/admin/reports'),
        color: 'secondary'
      },
    ],
  };

  const actions = customActions || (role ? roleActions[role] : null);
  const hasMultipleActions = actions && actions.length > 1;
  const singleAction = actions && actions.length === 1 ? actions[0] : null;

  // Color configurations
  const colorStyles = {
    primary: {
      bg: 'bg-green-500 hover:bg-green-600',
      text: 'text-white',
      shadow: 'shadow-lg shadow-green-500/30',
      ring: 'focus:ring-green-500',
    },
    secondary: {
      bg: 'bg-blue-500 hover:bg-blue-600',
      text: 'text-white',
      shadow: 'shadow-lg shadow-blue-500/30',
      ring: 'focus:ring-blue-500',
    },
    danger: {
      bg: 'bg-red-500 hover:bg-red-600',
      text: 'text-white',
      shadow: 'shadow-lg shadow-red-500/30',
      ring: 'focus:ring-red-500',
    },
  };

  // Position styles
  const positionStyles = {
    'bottom-right': 'right-4 bottom-20 md:bottom-6',
    'bottom-center': 'left-1/2 -translate-x-1/2 bottom-20 md:bottom-6',
  };

  // Size styles
  const sizeStyles = mini
    ? 'w-12 h-12'
    : 'w-14 h-14';

  const iconSize = mini ? 'w-5 h-5' : 'w-6 h-6';

  const styles = colorStyles[color];

  // Handle single action or toggle expansion
  const handleMainClick = () => {
    if (onClick) {
      onClick();
    } else if (singleAction) {
      singleAction.onClick();
    } else if (hasMultipleActions) {
      setIsExpanded(!isExpanded);
    }
  };

  const Icon = CustomIcon || (singleAction?.icon) || Plus;

  return (
    <div 
      className={`
        fixed z-40
        ${positionStyles[position]}
        ${className}
      `}
    >
      {/* Expanded actions menu */}
      {hasMultipleActions && isExpanded && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/20 -z-10"
            onClick={() => setIsExpanded(false)}
          />
          
          {/* Action buttons */}
          <div className="absolute bottom-16 right-0 flex flex-col-reverse gap-3 mb-2">
            {actions.map((action, index) => {
              const ActionIcon = action.icon;
              const actionStyles = colorStyles[action.color || 'secondary'];
              
              return (
                <button
                  key={index}
                  onClick={() => {
                    action.onClick();
                    setIsExpanded(false);
                  }}
                  className={`
                    flex items-center gap-3 pl-4 pr-2 py-2
                    rounded-full
                    ${actionStyles.bg} ${actionStyles.text} ${actionStyles.shadow}
                    transform transition-all duration-200
                    animate-fab-item
                    min-h-[44px]
                  `}
                  style={{ animationDelay: `${index * 50}ms` }}
                  aria-label={action.label}
                >
                  <span className="text-sm font-medium whitespace-nowrap">
                    {action.label}
                  </span>
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                    <ActionIcon className="w-5 h-5" />
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* Main FAB button */}
      <button
        onClick={handleMainClick}
        className={`
          ${extended ? 'px-6 rounded-full' : 'rounded-full'}
          ${sizeStyles}
          ${styles.bg} ${styles.text} ${styles.shadow}
          flex items-center justify-center gap-2
          transform transition-all duration-200
          hover:scale-105 active:scale-95
          focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-900 ${styles.ring}
        `}
        aria-label={label}
        aria-expanded={hasMultipleActions ? isExpanded : undefined}
      >
        {hasMultipleActions && isExpanded ? (
          <X className={iconSize} />
        ) : (
          <>
            <Icon className={iconSize} />
            {extended && extendedLabel && (
              <span className="font-medium">{extendedLabel}</span>
            )}
          </>
        )}
      </button>
    </div>
  );
};

export default FAB;
