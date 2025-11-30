/**
 * @file useUndo.js
 * @description Hook for undo/redo functionality
 * Phase 4: UI/UX Improvement - Gap 5
 * 
 * Usage:
 * import { useUndo, useUndoableAction } from '../hooks/useUndo';
 * 
 * // Simple usage
 * const { undo, redo, canUndo, canRedo } = useUndo();
 * 
 * // Create undoable action
 * const { createUndoable } = useUndoableAction();
 * 
 * const handleDelete = createUndoable({
 *   type: 'DELETE_VISITOR',
 *   description: 'Delete visitor John Doe',
 *   execute: () => deleteVisitor(id),
 *   undo: () => restoreVisitor(visitorData),
 *   data: { visitorId: id }
 * });
 */

export { useUndo, useUndoableAction, ACTION_TYPES } from '../contexts/UndoContext';
