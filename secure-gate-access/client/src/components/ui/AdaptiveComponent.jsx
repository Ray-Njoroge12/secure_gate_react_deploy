/**
 * AdaptiveComponent - Role-based component rendering system
 * 
 * This component automatically adapts its rendering based on:
 * - User role (super_admin, admin, guard, resident, visitor)
 * - Device type (mobile, tablet, desktop)
 * - Accessibility needs (screen reader, high contrast, etc.)
 * - Theme preferences (light, dark, high-contrast)
 * - Container size (when container queries are enabled)
 */

import React from 'react';
import { useAuth } from '../../contexts/AuthContext.js';
import { useTheme } from '../../contexts/ThemeContext.jsx';
import { useAccessibility } from '../../hooks/useAccessibility.js';
import { useEnhancedResponsive } from '../../hooks/useEnhancedResponsive.js';

/**
 * AdaptiveComponent - Renders different content based on context
 * 
 * @param {Object} props
 * @param {Object} props.variants - Role-based component variants
 * @param {React.Component} props.variants.super_admin - Super admin variant
 * @param {React.Component} props.variants.admin - Estate admin variant  
 * @param {React.Component} props.variants.guard - Security guard variant
 * @param {React.Component} props.variants.resident - Resident variant
 * @param {React.Component} props.variants.visitor - Visitor variant
 * @param {React.Component} props.variants.default - Default fallback variant
 * @param {Object} props.responsive - Device-specific variants
 * @param {React.Component} props.responsive.mobile - Mobile variant
 * @param {React.Component} props.responsive.tablet - Tablet variant
 * @param {React.Component} props.responsive.desktop - Desktop variant
 * @param {Object} props.accessibility - Accessibility-specific variants
 * @param {React.Component} props.accessibility.screenReader - Screen reader optimized
 * @param {React.Component} props.accessibility.highContrast - High contrast variant
 * @param {React.Component} props.accessibility.largeText - Large text variant
 * @param {Object} props.container - Container query variants
 * @param {React.Component} props.container.small - Small container variant
 * @param {React.Component} props.container.medium - Medium container variant
 * @param {React.Component} props.container.large - Large container variant
 * @param {Function} props.renderProp - Function that receives context and returns JSX
 * @param {React.ReactNode} props.children - Default children to render
 * @param {Object} props.permissions - Required permissions to render
 * @param {boolean} props.fallbackToDefault - Whether to show default if no variant matches
 * @param {boolean} props.enableContainerQueries - Enable container-based responsive behavior
 */
export const AdaptiveComponent = ({
  variants = {},
  responsive: responsiveVariants = {},
  accessibility = {},
  container = {},
  renderProp,
  children,
  permissions = {},
  fallbackToDefault = true,
  enableContainerQueries = false,
  className = '',
  ...props
}) => {
  const { user } = useAuth();
  const { resolvedTheme, isDark } = useTheme();
  const { 
    accessibilityState: {
      isScreenReader: isScreenReaderActive,
      isHighContrast: isHighContrastMode,
      isLargeText: isLargeTextMode,
      isReducedMotion: isReducedMotionMode
    }
  } = useAccessibility();
  const responsive = useEnhancedResponsive({ enableContainerQueries });

  // Build context object for render prop
  const context = {
    user,
    role: user?.role || 'visitor',
    theme: resolvedTheme,
    isDark,
    isMobile: responsive.isMobile,
    isTablet: responsive.isTablet,
    isDesktop: responsive.isDesktop,
    breakpoint: responsive.effectiveBreakpoint,
    containerBreakpoint: responsive.containerBreakpoint,
    containerWidth: responsive.containerWidth,
    accessibility: {
      screenReader: isScreenReaderActive,
      highContrast: isHighContrastMode,
      largeText: isLargeTextMode,
      reducedMotion: isReducedMotionMode
    },
    permissions: user?.permissions || [],
    responsive
  };

  // Check permissions if specified
  if (permissions.required && permissions.required.length > 0) {
    const hasPermission = permissions.required.some(permission => 
      context.permissions.includes(permission)
    );
    if (!hasPermission) {
      return permissions.fallback || null;
    }
  }

  // Use render prop if provided
  if (renderProp && typeof renderProp === 'function') {
    const content = renderProp(context);
    return (
      <div 
        className={className} 
        ref={enableContainerQueries ? responsive.containerRef : undefined}
        {...props}
      >
        {content}
      </div>
    );
  }

  // Priority order for variant selection:
  // 1. Accessibility variants (highest priority)
  // 2. Container query variants (if enabled)
  // 3. Responsive variants
  // 4. Role variants
  // 5. Default/children

  let SelectedComponent = null;

  // 1. Check accessibility variants first
  if (isScreenReaderActive && accessibility.screenReader) {
    SelectedComponent = accessibility.screenReader;
  } else if (isHighContrastMode && accessibility.highContrast) {
    SelectedComponent = accessibility.highContrast;
  } else if (isLargeTextMode && accessibility.largeText) {
    SelectedComponent = accessibility.largeText;
  }
  
  // 2. Check container query variants
  else if (enableContainerQueries && responsive.containerBreakpoint) {
    const containerSize = responsive.containerWidth < 400 ? 'small' :
                         responsive.containerWidth < 800 ? 'medium' : 'large';
    
    if (container[containerSize]) {
      SelectedComponent = container[containerSize];
    }
  }
  
  // 3. Check responsive variants
  else if (responsive.isMobile && responsiveVariants.mobile) {
    SelectedComponent = responsiveVariants.mobile;
  } else if (responsive.isTablet && responsiveVariants.tablet) {
    SelectedComponent = responsiveVariants.tablet;
  } else if (responsive.isDesktop && responsiveVariants.desktop) {
    SelectedComponent = responsiveVariants.desktop;
  }
  
  // 4. Check role variants
  else if (variants[context.role]) {
    SelectedComponent = variants[context.role];
  } else if (variants.default) {
    SelectedComponent = variants.default;
  }

  // 5. Fallback to children or null
  if (!SelectedComponent) {
    if (children) {
      return (
        <div 
          className={className} 
          ref={enableContainerQueries ? responsive.containerRef : undefined}
          {...props}
        >
          {children}
        </div>
      );
    }
    return fallbackToDefault ? (
      <div 
        className={className} 
        ref={enableContainerQueries ? responsive.containerRef : undefined}
        {...props} 
      />
    ) : null;
  }

  // Render selected component with context
  return (
    <div 
      className={className} 
      ref={enableContainerQueries ? responsive.containerRef : undefined}
      {...props}
    >
      <SelectedComponent {...context} />
    </div>
  );
};

/**
 * RoleBasedComponent - Simplified role-only adaptive component
 */
export const RoleBasedComponent = ({ 
  superAdmin, 
  admin, 
  guard, 
  resident, 
  visitor, 
  defaultComponent,
  ...props 
}) => {
  return (
    <AdaptiveComponent
      variants={{
        super_admin: superAdmin,
        admin: admin,
        guard: guard,
        resident: resident,
        visitor: visitor,
        default: defaultComponent
      }}
      {...props}
    />
  );
};

/**
 * ResponsiveComponent - Simplified responsive-only adaptive component
 */
export const ResponsiveComponent = ({ 
  mobile, 
  tablet, 
  desktop, 
  defaultComponent,
  enableContainerQueries = false,
  ...props 
}) => {
  return (
    <AdaptiveComponent
      responsive={{
        mobile: mobile,
        tablet: tablet,
        desktop: desktop
      }}
      variants={{
        default: defaultComponent
      }}
      enableContainerQueries={enableContainerQueries}
      {...props}
    />
  );
};

/**
 * AccessibilityComponent - Simplified accessibility-only adaptive component
 */
export const AccessibilityComponent = ({ 
  screenReader, 
  highContrast, 
  largeText,
  defaultComponent,
  ...props 
}) => {
  return (
    <AdaptiveComponent
      accessibility={{
        screenReader: screenReader,
        highContrast: highContrast,
        largeText: largeText
      }}
      variants={{
        default: defaultComponent
      }}
      {...props}
    />
  );
};

/**
 * ContainerQueryComponent - Container-based responsive component
 */
export const ContainerQueryComponent = ({
  small,
  medium,
  large,
  defaultComponent,
  ...props
}) => {
  return (
    <AdaptiveComponent
      container={{
        small: small,
        medium: medium,
        large: large
      }}
      variants={{
        default: defaultComponent
      }}
      enableContainerQueries={true}
      {...props}
    />
  );
};

export default AdaptiveComponent;