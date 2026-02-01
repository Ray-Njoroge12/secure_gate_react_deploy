import React, { useState } from 'react';
import Modal from '../ui/Modal';
import GradientButton from '../ui/GradientButton';
import { Building2, User, Mail, Lock, MapPin } from 'lucide-react';
import { handleApiError } from '../../utils/errorMapper';

// Helper for input fields
const InputField = ({ label, icon: Icon, type = "text", value, onChange, placeholder, required = false }) => (
    <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {label} {required && <span className="text-red-500">*</span>}
        </label>
        <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Icon className="h-5 w-5 text-gray-400" />
            </div>
            <input
                type={type}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition duration-150 ease-in-out"
                placeholder={placeholder}
                value={value}
                onChange={onChange}
                required={required}
            />
        </div>
    </div>
);

export default function AddEstateModal({ isOpen, onClose, onSuccess }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        address: '',
        adminName: '',
        adminEmail: '',
        adminPassword: ''
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const response = await fetch('/api/admin/super-admin/estates', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                throw new Error(await response.text() || 'Failed to create estate');
            }

            const data = await response.json();
            onSuccess(data);
            onClose();
            // Reset form
            setFormData({
                name: '',
                address: '',
                adminName: '',
                adminEmail: '',
                adminPassword: ''
            });
        } catch (err) {
            console.error('Create estate error:', err);
            // Try to parse JSON error if possible
            try {
                const jsonErr = JSON.parse(err.message);
                setError(jsonErr.message || 'Failed to create estate');
            } catch {
                setError('Failed to create estate. Please check inputs.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Add New Estate"
            size="lg"
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                    <div className="bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 p-4 mb-4">
                        <div className="flex">
                            <div className="ml-3">
                                <p className="text-sm text-red-700 dark:text-red-200">{error}</p>
                            </div>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Estate Details</h3>
                        <InputField
                            label="Estate Name"
                            icon={Building2}
                            value={formData.name}
                            onChange={(e) => handleChange({ target: { name: 'name', value: e.target.value } })}
                            placeholder="e.g. Sunset Vallley"
                            required
                        />
                        <InputField
                            label="Address"
                            icon={MapPin}
                            value={formData.address}
                            onChange={(e) => handleChange({ target: { name: 'address', value: e.target.value } })}
                            placeholder="Full address"
                        />
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Admin User</h3>
                        <InputField
                            label="Admin Name"
                            icon={User}
                            value={formData.adminName}
                            onChange={(e) => handleChange({ target: { name: 'adminName', value: e.target.value } })}
                            placeholder="Full name"
                            required
                        />
                        <InputField
                            label="Admin Email"
                            icon={Mail}
                            type="email"
                            value={formData.adminEmail}
                            onChange={(e) => handleChange({ target: { name: 'adminEmail', value: e.target.value } })}
                            placeholder="admin@example.com"
                            required
                        />
                        <InputField
                            label="Password"
                            icon={Lock}
                            type="password"
                            value={formData.adminPassword}
                            onChange={(e) => handleChange({ target: { name: 'adminPassword', value: e.target.value } })}
                            placeholder="Strong password"
                            required
                        />
                    </div>
                </div>

                <div className="mt-6 flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                    >
                        Cancel
                    </button>
                    <GradientButton
                        type="submit"
                        loading={loading}
                    >
                        Create Estate
                    </GradientButton>
                </div>
            </form>
        </Modal>
    );
}
