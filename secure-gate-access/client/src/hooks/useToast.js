/**
 * @file useToast.js
 * @description Hook for easy toast notification usage
 * Phase 4: UI/UX Improvement - Priority 1.2
 * 
 * Usage:
 * import { useToast } from '../hooks/useToast';
 * 
 * const { toast } = useToast();
 * 
 * // Simple usage
 * toast.success('Visitor invited successfully');
 * toast.error('Failed to send invite');
 * 
 * // Advanced usage
 * toast.success({
 *   title: 'Visitor Invited',
 *   message: 'John Doe has been sent an invite',
 *   action: { label: 'View', onClick: () => navigate('/visitor/123') },
 *   undo: { label: 'Undo', onClick: () => revokeInvite(123) }
 * });
 * 
 * // Promise toast
 * toast.promise(inviteVisitor(data), {
 *   loading: { title: 'Sending invite...' },
 *   success: { title: 'Invite sent!' },
 *   error: { title: 'Failed to send invite' }
 * });
 */

export { useToast } from '../contexts/ToastContext';
