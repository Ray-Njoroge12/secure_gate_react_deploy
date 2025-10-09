/**
 * Component Design Tokens
 * 
 * Component-specific design tokens that define the visual properties
 * and behavior of UI components in the SecureGate application.
 */

import { tokens } from './tokens';

// Button Component Tokens
export const buttonTokens = {
  // Button sizes
  size: {
    xs: {
      height: '32px',
      padding: '6px 12px',
      fontSize: tokens.typography.fontSize.xs[0],
      borderRadius: tokens.borderRadius.sm,
    },
    sm: {
      height: '36px',
      padding: '8px 16px',
      fontSize: tokens.typography.fontSize.sm[0],
      borderRadius: tokens.borderRadius.sm,
    },
    md: {
      height: '44px', // Touch-friendly minimum
      padding: '12px 20px',
      fontSize: tokens.typography.fontSize.base[0],
      borderRadius: tokens.borderRadius.md,
    },
    lg: {
      height: '48px',
      padding: '14px 24px',
      fontSize: tokens.typography.fontSize.lg[0],
      borderRadius: tokens.borderRadius.md,
    },
    xl: {
      height: '52px',
      padding: '16px 28px',
      fontSize: tokens.typography.fontSize.xl[0],
      borderRadius: tokens.borderRadius.lg,
    },
  },
  
  // Button variants
  variant: {
    primary: {
      background: tokens.colors.brand[500],
      backgroundHover: tokens.colors.brand[600],
      backgroundActive: tokens.colors.brand[700],
      backgroundDisabled: tokens.colors.slate[600],
      text: tokens.colors.slate[50],
      textDisabled: tokens.colors.slate[400],
      border: tokens.colors.brand[500],
      borderHover: tokens.colors.brand[600],
      borderActive: tokens.colors.brand[700],
      borderDisabled: tokens.colors.slate[600],
      shadow: tokens.shadows.sm,
      shadowHover: tokens.shadows.md,
    },
    secondary: {
      background: 'transparent',
      backgroundHover: tokens.colors.slate[700],
      backgroundActive: tokens.colors.slate[600],
      backgroundDisabled: 'transparent',
      text: tokens.colors.slate[300],
      textHover: tokens.colors.slate[50],
      textDisabled: tokens.colors.slate[500],
      border: tokens.colors.slate[600],
      borderHover: tokens.colors.slate[500],
      borderActive: tokens.colors.slate[400],
      borderDisabled: tokens.colors.slate[700],
      shadow: 'none',
      shadowHover: tokens.shadows.sm,
    },
    danger: {
      background: tokens.colors.error[500],
      backgroundHover: tokens.colors.error[600],
      backgroundActive: tokens.colors.error[700],
      backgroundDisabled: tokens.colors.slate[600],
      text: tokens.colors.slate[50],
      textDisabled: tokens.colors.slate[400],
      border: tokens.colors.error[500],
      borderHover: tokens.colors.error[600],
      borderActive: tokens.colors.error[700],
      borderDisabled: tokens.colors.slate[600],
      shadow: tokens.shadows.sm,
      shadowHover: tokens.shadows.md,
    },
    ghost: {
      background: 'transparent',
      backgroundHover: tokens.colors.slate[800],
      backgroundActive: tokens.colors.slate[700],
      backgroundDisabled: 'transparent',
      text: tokens.colors.slate[400],
      textHover: tokens.colors.slate[200],
      textDisabled: tokens.colors.slate[600],
      border: 'transparent',
      borderHover: 'transparent',
      borderActive: 'transparent',
      borderDisabled: 'transparent',
      shadow: 'none',
      shadowHover: 'none',
    },
  },
  
  // Button states
  state: {
    focus: {
      outline: `2px solid ${tokens.colors.brand[500]}`,
      outlineOffset: '2px',
    },
    disabled: {
      opacity: 0.5,
      cursor: 'not-allowed',
    },
  },
};

// Input Component Tokens
export const inputTokens = {
  // Input sizes
  size: {
    sm: {
      height: '36px',
      padding: '8px 12px',
      fontSize: tokens.typography.fontSize.sm[0],
      borderRadius: tokens.borderRadius.sm,
    },
    md: {
      height: '44px', // Touch-friendly minimum
      padding: '12px 16px',
      fontSize: tokens.typography.fontSize.base[0],
      borderRadius: tokens.borderRadius.md,
    },
    lg: {
      height: '48px',
      padding: '14px 20px',
      fontSize: tokens.typography.fontSize.lg[0],
      borderRadius: tokens.borderRadius.md,
    },
  },
  
  // Input variants
  variant: {
    default: {
      background: tokens.colors.slate[800],
      backgroundFocus: tokens.colors.slate[700],
      backgroundDisabled: tokens.colors.slate[900],
      text: tokens.colors.slate[50],
      textPlaceholder: tokens.colors.slate[400],
      textDisabled: tokens.colors.slate[500],
      border: tokens.colors.slate[600],
      borderFocus: tokens.colors.brand[500],
      borderError: tokens.colors.error[500],
      borderSuccess: tokens.colors.success[500],
      borderDisabled: tokens.colors.slate[700],
      shadow: 'none',
      shadowFocus: `0 0 0 2px ${tokens.colors.brand[500]}20`,
    },
    filled: {
      background: tokens.colors.slate[700],
      backgroundFocus: tokens.colors.slate[600],
      backgroundDisabled: tokens.colors.slate[800],
      text: tokens.colors.slate[50],
      textPlaceholder: tokens.colors.slate[400],
      textDisabled: tokens.colors.slate[500],
      border: 'transparent',
      borderFocus: tokens.colors.brand[500],
      borderError: tokens.colors.error[500],
      borderSuccess: tokens.colors.success[500],
      borderDisabled: 'transparent',
      shadow: 'none',
      shadowFocus: `0 0 0 2px ${tokens.colors.brand[500]}20`,
    },
  },
  
  // Input states
  state: {
    focus: {
      outline: 'none',
      ring: `0 0 0 2px ${tokens.colors.brand[500]}20`,
    },
    error: {
      borderColor: tokens.colors.error[500],
      ringColor: `${tokens.colors.error[500]}20`,
    },
    success: {
      borderColor: tokens.colors.success[500],
      ringColor: `${tokens.colors.success[500]}20`,
    },
    disabled: {
      opacity: 0.5,
      cursor: 'not-allowed',
    },
  },
};

// Card Component Tokens
export const cardTokens = {
  // Card sizes
  size: {
    sm: {
      padding: tokens.spacing[4],
      borderRadius: tokens.borderRadius.md,
      shadow: tokens.shadows.sm,
    },
    md: {
      padding: tokens.spacing[6],
      borderRadius: tokens.borderRadius.lg,
      shadow: tokens.shadows.md,
    },
    lg: {
      padding: tokens.spacing[8],
      borderRadius: tokens.borderRadius.lg,
      shadow: tokens.shadows.lg,
    },
  },
  
  // Card variants
  variant: {
    default: {
      background: tokens.colors.slate[800],
      border: tokens.colors.slate[700],
      text: tokens.colors.slate[50],
    },
    elevated: {
      background: tokens.colors.slate[800],
      border: tokens.colors.slate[600],
      text: tokens.colors.slate[50],
      shadow: tokens.shadows.lg,
    },
    outlined: {
      background: 'transparent',
      border: tokens.colors.slate[600],
      text: tokens.colors.slate[50],
      shadow: 'none',
    },
    filled: {
      background: tokens.colors.slate[700],
      border: 'transparent',
      text: tokens.colors.slate[50],
      shadow: 'none',
    },
  },
  
  // Card states
  state: {
    hover: {
      shadow: tokens.shadows.lg,
      transform: 'translateY(-1px)',
    },
    active: {
      shadow: tokens.shadows.md,
      transform: 'translateY(0)',
    },
  },
};

// Modal Component Tokens
export const modalTokens = {
  // Modal sizes
  size: {
    sm: {
      maxWidth: '400px',
      padding: tokens.spacing[6],
      borderRadius: tokens.borderRadius.lg,
    },
    md: {
      maxWidth: '500px',
      padding: tokens.spacing[8],
      borderRadius: tokens.borderRadius.xl,
    },
    lg: {
      maxWidth: '700px',
      padding: tokens.spacing[10],
      borderRadius: tokens.borderRadius.xl,
    },
    xl: {
      maxWidth: '900px',
      padding: tokens.spacing[12],
      borderRadius: tokens.borderRadius['2xl'],
    },
    full: {
      maxWidth: '100vw',
      maxHeight: '100vh',
      padding: tokens.spacing[6],
      borderRadius: 0,
    },
  },
  
  // Modal variants
  variant: {
    default: {
      background: tokens.colors.slate[800],
      border: tokens.colors.slate[700],
      shadow: tokens.shadows.xl,
      backdrop: 'rgba(0, 0, 0, 0.5)',
    },
    centered: {
      background: tokens.colors.slate[800],
      border: tokens.colors.slate[700],
      shadow: tokens.shadows.xl,
      backdrop: 'rgba(0, 0, 0, 0.5)',
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
    },
  },
  
  // Modal states
  state: {
    open: {
      opacity: 1,
      transform: 'scale(1)',
    },
    closed: {
      opacity: 0,
      transform: 'scale(0.95)',
    },
  },
};

// Sidebar Component Tokens
export const sidebarTokens = {
  // Sidebar sizes
  size: {
    sm: {
      width: '240px',
      collapsedWidth: '64px',
    },
    md: {
      width: '256px',
      collapsedWidth: '64px',
    },
    lg: {
      width: '280px',
      collapsedWidth: '64px',
    },
  },
  
  // Sidebar variants
  variant: {
    default: {
      background: tokens.colors.slate[900],
      border: tokens.colors.slate[700],
      text: tokens.colors.slate[300],
      textActive: tokens.colors.slate[50],
      textHover: tokens.colors.slate[200],
      shadow: tokens.shadows.lg,
    },
    minimal: {
      background: 'transparent',
      border: tokens.colors.slate[700],
      text: tokens.colors.slate[400],
      textActive: tokens.colors.brand[500],
      textHover: tokens.colors.slate[200],
      shadow: 'none',
    },
  },
  
  // Sidebar states
  state: {
    expanded: {
      width: 'inherit',
      opacity: 1,
    },
    collapsed: {
      width: '64px',
      opacity: 1,
    },
    hidden: {
      width: '0px',
      opacity: 0,
    },
  },
};

// Topbar Component Tokens
export const topbarTokens = {
  // Topbar sizes
  size: {
    sm: {
      height: '56px',
      padding: `0 ${tokens.spacing[4]}`,
    },
    md: {
      height: '64px',
      padding: `0 ${tokens.spacing[6]}`,
    },
    lg: {
      height: '72px',
      padding: `0 ${tokens.spacing[8]}`,
    },
  },
  
  // Topbar variants
  variant: {
    default: {
      background: tokens.colors.slate[900],
      border: tokens.colors.slate[700],
      text: tokens.colors.slate[300],
      shadow: tokens.shadows.sm,
    },
    transparent: {
      background: 'transparent',
      border: 'transparent',
      text: tokens.colors.slate[300],
      shadow: 'none',
    },
  },
  
  // Topbar states
  state: {
    sticky: {
      position: 'sticky',
      top: 0,
      zIndex: tokens.zIndex.sticky,
    },
    fixed: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: tokens.zIndex.sticky,
    },
  },
};

// Badge Component Tokens
export const badgeTokens = {
  // Badge sizes
  size: {
    xs: {
      height: '20px',
      padding: '2px 6px',
      fontSize: tokens.typography.fontSize.xs[0],
      borderRadius: tokens.borderRadius.sm,
    },
    sm: {
      height: '24px',
      padding: '4px 8px',
      fontSize: tokens.typography.fontSize.xs[0],
      borderRadius: tokens.borderRadius.sm,
    },
    md: {
      height: '28px',
      padding: '6px 12px',
      fontSize: tokens.typography.fontSize.sm[0],
      borderRadius: tokens.borderRadius.md,
    },
    lg: {
      height: '32px',
      padding: '8px 16px',
      fontSize: tokens.typography.fontSize.sm[0],
      borderRadius: tokens.borderRadius.md,
    },
  },
  
  // Badge variants
  variant: {
    default: {
      background: tokens.colors.slate[700],
      text: tokens.colors.slate[200],
      border: 'transparent',
    },
    primary: {
      background: tokens.colors.brand[500],
      text: tokens.colors.slate[50],
      border: 'transparent',
    },
    success: {
      background: tokens.colors.success[500],
      text: tokens.colors.slate[50],
      border: 'transparent',
    },
    warning: {
      background: tokens.colors.warning[500],
      text: tokens.colors.slate[50],
      border: 'transparent',
    },
    error: {
      background: tokens.colors.error[500],
      text: tokens.colors.slate[50],
      border: 'transparent',
    },
    outlined: {
      background: 'transparent',
      text: tokens.colors.slate[300],
      border: tokens.colors.slate[600],
    },
  },
};

// Toast Component Tokens
export const toastTokens = {
  // Toast sizes
  size: {
    sm: {
      minHeight: '48px',
      padding: `${tokens.spacing[3]} ${tokens.spacing[4]}`,
      fontSize: tokens.typography.fontSize.sm[0],
      borderRadius: tokens.borderRadius.md,
    },
    md: {
      minHeight: '56px',
      padding: `${tokens.spacing[4]} ${tokens.spacing[5]}`,
      fontSize: tokens.typography.fontSize.base[0],
      borderRadius: tokens.borderRadius.lg,
    },
    lg: {
      minHeight: '64px',
      padding: `${tokens.spacing[5]} ${tokens.spacing[6]}`,
      fontSize: tokens.typography.fontSize.lg[0],
      borderRadius: tokens.borderRadius.lg,
    },
  },
  
  // Toast variants
  variant: {
    success: {
      background: tokens.colors.success[500],
      text: tokens.colors.slate[50],
      border: 'transparent',
      icon: tokens.colors.slate[50],
    },
    error: {
      background: tokens.colors.error[500],
      text: tokens.colors.slate[50],
      border: 'transparent',
      icon: tokens.colors.slate[50],
    },
    warning: {
      background: tokens.colors.warning[500],
      text: tokens.colors.slate[50],
      border: 'transparent',
      icon: tokens.colors.slate[50],
    },
    info: {
      background: tokens.colors.info[500],
      text: tokens.colors.slate[50],
      border: 'transparent',
      icon: tokens.colors.slate[50],
    },
  },
  
  // Toast positions
  position: {
    'top-left': {
      top: tokens.spacing[4],
      left: tokens.spacing[4],
    },
    'top-right': {
      top: tokens.spacing[4],
      right: tokens.spacing[4],
    },
    'bottom-left': {
      bottom: tokens.spacing[4],
      left: tokens.spacing[4],
    },
    'bottom-right': {
      bottom: tokens.spacing[4],
      right: tokens.spacing[4],
    },
  },
};

// Export all component tokens
export const componentTokens = {
  button: buttonTokens,
  input: inputTokens,
  card: cardTokens,
  modal: modalTokens,
  sidebar: sidebarTokens,
  topbar: topbarTokens,
  badge: badgeTokens,
  toast: toastTokens,
};

export default componentTokens;




