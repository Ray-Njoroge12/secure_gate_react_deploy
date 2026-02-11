/**
 * @fileoverview Unified Icon component for SecureGate Access
 * @description Centralized icon wrapper that ensures consistent sizing,
 * accessibility attributes, and theme-aware coloring for all icons.
 * Uses lucide-react as the underlying icon library.
 * @author Secure Gate Access Team
 * @version 1.0.0
 */

import {
  Accessibility,
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BarChart2,
  BarChart3,
  Bell,
  BellOff,
  BellRing,
  BookOpen,
  Bot,
  Bug,
  Building,
  Building2,
  Calendar,
  Camera,
  CameraOff,
  Car,
  Check,
  CheckCheck,
  CheckCircle,
  CheckSquare,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  CloudOff,
  Contact,
  Cookie,
  Copy,
  Cpu,
  CreditCard,
  Database,
  DoorOpen,
  Download,
  Edit,
  Edit2,
  ExternalLink,
  Eye,
  EyeOff,
  File,
  FileCheck,
  FileSpreadsheet,
  FileText,
  FileWarning,
  Filter,
  Flashlight,
  FlashlightOff,
  Gavel,
  GripVertical,
  Heart,
  HelpCircle,
  Home,
  Image,
  Info,
  Keyboard,
  KeyRound,
  LayoutDashboard,
  LifeBuoy,
  Lightbulb,
  Link,
  Loader2,
  Lock,
  LogOut,
  Mail,
  MapPin,
  Menu,
  MessageCircle,
  MessageSquare,
  Minus,
  Monitor,
  Moon,
  MoreHorizontal,
  MoreVertical,
  Package,
  Pause,
  Phone,
  Play,
  Plus,
  QrCode,
  Radio,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Send,
  Server,
  ServerCrash,
  Settings,
  Share2,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldOff,
  Smartphone,
  SortAsc,
  SortDesc,
  Star,
  Sun,
  Target,
  Ticket,
  Trash2,
  TrendingDown,
  TrendingUp,
  Unlock,
  Upload,
  User,
  UserCheck,
  UserPlus,
  UserX,
  Users,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
  X,
  XCircle,
  Zap
} from 'lucide-react';
import React, { memo } from 'react';

/**
 * Registry mapping string names to Lucide icon components.
 */
const ICON_REGISTRY = {
  // kebab-case keys
  'accessibility': Accessibility,
  'activity': Activity,
  'alert-circle': AlertCircle,
  'alert-triangle': AlertTriangle,
  'exclamation-triangle': AlertTriangle,
  'arrow-left': ArrowLeft,
  'arrow-right': ArrowRight,
  'bar-chart-2': BarChart2,
  'bar-chart-3': BarChart3,
  'bell': Bell,
  'bell-off': BellOff,
  'bell-ring': BellRing,
  'book-open': BookOpen,
  'bot': Bot,
  'bug': Bug,
  'building': Building,
  'building-2': Building2,
  'calendar': Calendar,
  'camera': Camera,
  'camera-off': CameraOff,
  'car': Car,
  'check': Check,
  'check-check': CheckCheck,
  'check-circle': CheckCircle,
  'check-square': CheckSquare,
  'chevron-down': ChevronDown,
  'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight,
  'chevron-up': ChevronUp,
  'clock': Clock,
  'cloud-off': CloudOff,
  'contact': Contact,
  'cookie': Cookie,
  'copy': Copy,
  'cpu': Cpu,
  'credit-card': CreditCard,
  'database': Database,
  'door': DoorOpen,
  'door-open': DoorOpen,
  'download': Download,
  'edit': Edit,
  'edit-2': Edit2,
  'external-link': ExternalLink,
  'eye': Eye,
  'eye-off': EyeOff,
  'file': File,
  'file-check': FileCheck,
  'file-spreadsheet': FileSpreadsheet,
  'file-text': FileText,
  'file-warning': FileWarning,
  'filter': Filter,
  'flashlight': Flashlight,
  'flashlight-off': FlashlightOff,
  'gavel': Gavel,
  'grip-vertical': GripVertical,
  'heart': Heart,
  'help-circle': HelpCircle,
  'home': Home,
  'image': Image,
  'info': Info,
  'keyboard': Keyboard,
  'key-round': KeyRound,
  'layout-dashboard': LayoutDashboard,
  'life-buoy': LifeBuoy,
  'lightbulb': Lightbulb,
  'link': Link,
  'loader-2': Loader2,
  'lock': Lock,
  'log-out': LogOut,
  'mail': Mail,
  'map-pin': MapPin,
  'menu': Menu,
  'message-circle': MessageCircle,
  'message-square': MessageSquare,
  'minus': Minus,
  'monitor': Monitor,
  'moon': Moon,
  'more-horizontal': MoreHorizontal,
  'more-vertical': MoreVertical,
  'package': Package,
  'pause': Pause,
  'phone': Phone,
  'play': Play,
  'plus': Plus,
  'qr-code': QrCode,
  'radio': Radio,
  'refresh-cw': RefreshCw,
  'rotate-ccw': RotateCcw,
  'save': Save,
  'search': Search,
  'send': Send,
  'server': Server,
  'server-crash': ServerCrash,
  'settings': Settings,
  'share-2': Share2,
  'shield': Shield,
  'shield-alert': ShieldAlert,
  'shield-check': ShieldCheck,
  'shield-off': ShieldOff,
  'smartphone': Smartphone,
  'sort-asc': SortAsc,
  'sort-desc': SortDesc,
  'star': Star,
  'sun': Sun,
  'target': Target,
  'ticket': Ticket,
  'trash-2': Trash2,
  'trending-down': TrendingDown,
  'trending-up': TrendingUp,
  'unlock': Unlock,
  'upload': Upload,
  'user': User,
  'user-check': UserCheck,
  'user-plus': UserPlus,
  'user-x': UserX,
  'users': Users,
  'volume-2': Volume2,
  'volume-x': VolumeX,
  'wifi': Wifi,
  'wifi-off': WifiOff,
  'x': X,
  'x-circle': XCircle,
  'zap': Zap,
  // PascalCase aliases (for compatibility with existing usage)
  'Accessibility': Accessibility,
  'Activity': Activity,
  'AlertCircle': AlertCircle,
  'AlertTriangle': AlertTriangle,
  'ArrowLeft': ArrowLeft,
  'ArrowRight': ArrowRight,
  'BarChart2': BarChart2,
  'BarChart3': BarChart3,
  'Bell': Bell,
  'BellOff': BellOff,
  'BellRing': BellRing,
  'BookOpen': BookOpen,
  'Bot': Bot,
  'Bug': Bug,
  'Building': Building,
  'Building2': Building2,
  'Calendar': Calendar,
  'Camera': Camera,
  'CameraOff': CameraOff,
  'Car': Car,
  'Check': Check,
  'CheckCheck': CheckCheck,
  'CheckCircle': CheckCircle,
  'CheckSquare': CheckSquare,
  'ChevronDown': ChevronDown,
  'ChevronLeft': ChevronLeft,
  'ChevronRight': ChevronRight,
  'ChevronUp': ChevronUp,
  'Clock': Clock,
  'CloudOff': CloudOff,
  'Contact': Contact,
  'Cookie': Cookie,
  'Copy': Copy,
  'Cpu': Cpu,
  'CreditCard': CreditCard,
  'Database': Database,
  'DoorOpen': DoorOpen,
  'Download': Download,
  'Edit': Edit,
  'Edit2': Edit2,
  'ExternalLink': ExternalLink,
  'Eye': Eye,
  'EyeOff': EyeOff,
  'File': File,
  'FileCheck': FileCheck,
  'FileSpreadsheet': FileSpreadsheet,
  'FileText': FileText,
  'FileWarning': FileWarning,
  'Filter': Filter,
  'Flashlight': Flashlight,
  'FlashlightOff': FlashlightOff,
  'Gavel': Gavel,
  'GripVertical': GripVertical,
  'Heart': Heart,
  'HelpCircle': HelpCircle,
  'Home': Home,
  'Image': Image,
  'Info': Info,
  'Keyboard': Keyboard,
  'KeyRound': KeyRound,
  'LayoutDashboard': LayoutDashboard,
  'LifeBuoy': LifeBuoy,
  'Lightbulb': Lightbulb,
  'Link': Link,
  'Loader2': Loader2,
  'Lock': Lock,
  'LogOut': LogOut,
  'Mail': Mail,
  'MapPin': MapPin,
  'Menu': Menu,
  'MessageCircle': MessageCircle,
  'MessageSquare': MessageSquare,
  'Minus': Minus,
  'Monitor': Monitor,
  'Moon': Moon,
  'MoreHorizontal': MoreHorizontal,
  'MoreVertical': MoreVertical,
  'Package': Package,
  'Pause': Pause,
  'Phone': Phone,
  'Play': Play,
  'Plus': Plus,
  'QrCode': QrCode,
  'Radio': Radio,
  'RefreshCw': RefreshCw,
  'RotateCcw': RotateCcw,
  'Save': Save,
  'Search': Search,
  'Send': Send,
  'Server': Server,
  'ServerCrash': ServerCrash,
  'Settings': Settings,
  'Share2': Share2,
  'Shield': Shield,
  'ShieldAlert': ShieldAlert,
  'ShieldCheck': ShieldCheck,
  'ShieldOff': ShieldOff,
  'Smartphone': Smartphone,
  'SortAsc': SortAsc,
  'SortDesc': SortDesc,
  'Star': Star,
  'Sun': Sun,
  'Target': Target,
  'Ticket': Ticket,
  'Trash2': Trash2,
  'TrendingDown': TrendingDown,
  'TrendingUp': TrendingUp,
  'Unlock': Unlock,
  'Upload': Upload,
  'User': User,
  'UserCheck': UserCheck,
  'UserPlus': UserPlus,
  'UserX': UserX,
  'Users': Users,
  'Volume2': Volume2,
  'VolumeX': VolumeX,
  'Wifi': Wifi,
  'WifiOff': WifiOff,
  'X': X,
  'XCircle': XCircle,
  'Zap': Zap,
};

/**
 * Icon size presets mapped to pixel values.
 * All sizes ensure minimum 16px for visibility.
 * @constant {Object.<string, number>}
 */
const ICON_SIZES = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
};

/**
 * Unified Icon component that wraps lucide-react icons with
 * consistent sizing, color, and accessibility support.
 * 
 *
 * @component
 * @param {Object} props - Component props
 * @param {React.ComponentType} [props.icon] - A lucide-react icon component (legacy)
 * @param {string} [props.name] - Name of functionality/icon to render (preferred)
 * @param {string|number} [props.size='md'] - Preset size: 'xs' | 'sm' | 'md' | 'lg' | 'xl' or numeric pixels
 * @param {number} [props.sizeOverride] - Explicit pixel size override
 * @param {string} [props.className=''] - Additional CSS classes for the icon
 * @param {string} [props.color] - CSS color string. Defaults to 'currentColor'
 * @param {number} [props.strokeWidth=2] - Stroke width for the icon
 * @param {string} [props['aria-label']] - Accessible label. If provided, icon is treated as meaningful.
 * @param {boolean} [props['aria-hidden']] - Explicitly hide from screen readers. Defaults to true when no aria-label.
 * @returns {JSX.Element|null} Icon component
 */
const Icon = memo(({
  icon: IconComponentProp,
  name,
  size = 'md',
  sizeOverride,
  className = '',
  color = 'currentColor',
  strokeWidth = 2,
  'aria-label': ariaLabel,
  'aria-hidden': ariaHiddenProp,
  ...props
}) => {
  // Resolve icon from name registry or prop
  let IconComponent = IconComponentProp;
  
  if (name && ICON_REGISTRY[name]) {
    IconComponent = ICON_REGISTRY[name];
  } else if (typeof IconComponentProp === 'string' && ICON_REGISTRY[IconComponentProp]) {
    // Handle case where string is passed to 'icon' prop
    IconComponent = ICON_REGISTRY[IconComponentProp];
  }

  if (!IconComponent) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`Icon: No icon found for name "${name}" or icon prop`, IconComponentProp);
    }
    return null;
  }

  const resolvedSize = typeof size === 'number' ? size : (ICON_SIZES[size] || ICON_SIZES.md);
  const pixelSize = sizeOverride || resolvedSize;
  const sizeClassToken = typeof size === 'number' ? 'custom' : size;
  const isDecorative = !ariaLabel;
  const ariaHidden = ariaHiddenProp !== undefined ? ariaHiddenProp : isDecorative;

  return (
    <IconComponent
      width={pixelSize}
      height={pixelSize}
      color={color}
      strokeWidth={strokeWidth}
      className={`sg-icon sg-icon--${sizeClassToken} ${className}`.trim()}
      aria-label={ariaLabel}
      aria-hidden={ariaHidden}
      role={ariaLabel ? 'img' : undefined}
      focusable="false"
      {...props}
    />
  );
});

Icon.displayName = 'Icon';

export { ICON_SIZES };
// Export Icon as named export as well to support brace imports like { Icon }
export { Icon };
export default Icon;
