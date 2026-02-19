import React, { useState } from 'react';
import { Modal, Button, Input } from '../ui';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

const PasswordConfirmationModal = ({ isOpen, onClose, onConfirm, title = "Confirm Identity", message = "Please enter your password to continue." }) => {
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { verifyPassword } = useAuth();
    const toast = useToast();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!password) return;

        setLoading(true);
        try {
            const isValid = await verifyPassword(password);
            if (isValid) {
                onConfirm();
                setPassword('');
                onClose();
            } else {
                toast.error('Incorrect password. Please try again.');
                setPassword('');
            }
        } catch (error) {
            toast.error('Verification failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <p className="text-gray-600 dark:text-gray-300">
                    {message}
                </p>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Password
                    </label>
                    <Input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        autoFocus
                        required
                        className="w-full"
                    />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-slate-700">
                    <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                        Cancel
                    </Button>
                    <Button type="submit" variant="primary" disabled={loading || !password}>
                        {loading ? 'Verifying...' : 'Confirm'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
};

export default PasswordConfirmationModal;
