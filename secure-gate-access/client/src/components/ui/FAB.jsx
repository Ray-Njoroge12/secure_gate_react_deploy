// client/src/components/ui/FAB.jsx
// Floating Action Button - Industry standard pattern (Gmail, Instagram)
/* eslint-disable react/forbid-elements */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import Icon from './Icon.jsx';

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
        iconName: 'user-plus',
        label: 'Quick Invite', 
        onClick: () => navigate('/resident/quick-invite'),
        color: 'primary'
      },
      { 
        iconName: 'file-text',
        label: 'Bulk Invite', 
        onClick: () => navigate('/resident/bulk-invite'),
        color: 'secondary'
      },
      { 
        iconName: 'qr-code',
        label: 'Quick Invite', 
        onClick: () => navigate('/resident/quick-invite'),
        color: 'primary'
      }
    ],
    guard: [
      { 
        iconName: 'user-plus',
        label: 'New Entry', 
        onClick: () => navigate('/dashboard/guard/walk-in'),
        color: 'primary'
      },
      { 
        iconName: 'alert-triangle',
        label: 'Report Incident', 
        onClick: () => navigate('/dashboard/guard/incidents'),
        color: 'danger'
      }
    ],
    admin: [
      { 
        iconName: 'users',
        label: 'User Approvals', 
        onClick: () => navigate('/dashboard/admin/approvals'),
        color: 'primary'
      }
    ]
  };

  const actions = customActions || roleActions[role] || [];
  const MainIcon = CustomIcon || null;

  // Toggle internal state
  const handleToggle = () => {
    if (onClick && !actions.length) {
      onClick();
    } else {
      setIsExpanded(!isExpanded);
    }
  };

  const getPositionClasses = () => {
    switch (position) {
      case 'bottom-center': return 'bottom-6 left-1/2 -translate-x-1/2';
      default: return 'bottom-6 right-6';
    }
  };

  return (
    <div className={`fixed z-40 flex flex-col items-end ${getPositionClasses()} ${className} pointer-events-none`}>
      {/* Action Menu */}
      <div className={`transition-all duration-300 ease-in-out ${isExpanded ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-10 pointer-events-none'}`}>
        {actions.map((action, index) => (
          <div 
            key={index} 
            className="flex items-center justify-end mb-3 mr-1"
            style={{ transitionDelay: `${index * 50}ms` }}
          >
            {/* Label Tooltip */}
            <span className="bg-white dark:bg-slate-800 text-gray-800 dark:text-white text-xs font-semibold py-1 px-3 rounded shadow-lg mr-3">
              {action.label}
            </span>
            
            {/* Action Button */}
            <button
              onClick={() => {
                action.onClick();
                setIsExpanded(false);
              }}
              className={`
                w-10 h-10 rounded-full flex items-center justify-center shadow-lg transform transition-transform hover:scale-110 active:scale-90
                ${action.color === 'danger' ? 'bg-red-500 hover:bg-red-600' : 
                  action.color === 'secondary' ? 'bg-gray-600 hover:bg-gray-700' : 
                  'bg-brand-600 hover:bg-brand-700'}
                text-white
              `}
              aria-label={action.label}
            >
              <Icon name={action.iconName} size={20} />
            </button>
          </div>
        ))}
      </div>

      {/* Main FAB */}
      <div className="pointer-events-auto">
        <button
          onClick={handleToggle}
          className={`
            flex items-center justify-center shadow-lg transition-all duration-300 transform
            ${mini ? 'w-10 h-10' : 'w-14 h-14'}
            ${extended ? 'px-6 w-auto rounded-full' : 'rounded-full hover:rotate-90'}
            ${isExpanded ? 'bg-gray-700 rotate-45' : `bg-${color === 'danger' ? 'red' : 'brand'}-600`}
            hover:shadow-xl hover:scale-105 active:scale-95 text-white
          `}
          aria-label={label}
          aria-expanded={isExpanded}
        >
          <div className={`transition-transform duration-300 ${isExpanded ? 'rotate-45' : 'rotate-0'}`}>
            {MainIcon ? (
              <Icon icon={MainIcon} size={mini ? 20 : 24} />
            ) : (
              <Icon name={isExpanded ? 'x' : 'plus'} size={mini ? 20 : 24} />
            )}
          </div>
          
          {extended && !isExpanded && (
            <span className="ml-2 font-semibold text-sm whitespace-nowrap">
              {extendedLabel || label}
            </span>
          )}
        </button>
      </div>
    </div>
  );
};

export default FAB;
