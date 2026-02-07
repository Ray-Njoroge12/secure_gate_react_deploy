import React, { useState, useCallback } from 'react';
import Modal from '../ui/Modal';
import GradientButton from '../ui/GradientButton';
import { Building2, User, Mail, Lock, MapPin, AlertCircle, CheckCircle } from 'lucide-react';
import { handleApiError } from '../../utils/errorMapper';

// Password validation helper
const validatePassword = (password) => {
    const requirements = {
        minLength: password.length >= 8,
        hasLowercase: /[a-z]/.test(password),
        hasUppercase: /[A-Z]/.test(password),
        hasNumber: /[0-9]/.test(password),
        hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };
    const isValid = Object.values(requirements).every(Boolean);
    return { isValid, requirements };
};

// Email validation helper
const validateEmail = (email) => {
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    return email && emailRegex.test(email.trim());
};

// Helper for input fields with validation state
const InputField = ({ 
    label, 
    icon: Icon, 
    type = "text", 
    value, 
    onChange, 
    placeholder, 
    required = false,
    error,
    hint 
}) => (
    <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {label} {required && <span className="text-red-500">*</span>}
        </label>
        <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Icon className={`h-5 w-5 ${error ? 'text-red-400' : 'text-gray-400 dark:text-gray-300'}`} />
            </div>
            <input
                type={type}
                className={`block w-full pl-10 pr-3 py-2 border rounded-md leading-5 bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-1 sm:text-sm transition duration-150 ease-in-out ${
                    error 
                        ? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
                        : 'border-gray-300 dark:border-slate-600 focus:ring-indigo-500 focus:border-indigo-500'
                }`}
                placeholder={placeholder}
                value={value}
                onChange={onChange}
                required={required}
                aria-invalid={error ? 'true' : 'false'}
                aria-describedby={error ? `${label}-error` : undefined}
            />
        </div>
        {error && (
            <p id={`${label}-error`} className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {error}
            </p>
        )}
        {hint && !error && (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-300">{hint}</p>
        )}
    </div>
);

// Password requirements indicator
const PasswordRequirements = ({ password }) => {
    const { requirements } = validatePassword(password);
    
    const requirementItems = [
        { key: 'minLength', label: 'At least 8 characters', met: requirements.minLength },
        { key: 'hasLowercase', label: 'One lowercase letter', met: requirements.hasLowercase },
        { key: 'hasUppercase', label: 'One uppercase letter', met: requirements.hasUppercase },
        { key: 'hasNumber', label: 'One number', met: requirements.hasNumber },
        { key: 'hasSpecial', label: 'One special character', met: requirements.hasSpecial }
    ];

    return (
        <div className="mt-2 p-3 bg-gray-50 dark:bg-slate-800 rounded-md">
            <p className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-2">Password Requirements:</p>
            <ul className="space-y-1">
                {requirementItems.map(({ key, label, met }) => (
                    <li key={key} className={`text-xs flex items-center gap-1 ${met ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-300'}`}>
                        {met ? <CheckCircle className="h-3 w-3" /> : <span className="h-3 w-3 rounded-full border border-gray-400" />}
                        {label}
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default function AddEstateModal({ isOpen, onClose, onSuccess }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [fieldErrors, setFieldErrors] = useState({});
    const [formData, setFormData] = useState({
        name: '',
        address: '',
        adminName: '',
        adminEmail: '',
        adminPassword: ''
    });
    const [showPasswordReqs, setShowPasswordReqs] = useState(false);

    const handleChange = useCallback((e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        // Clear field error when user types
        if (fieldErrors[name]) {
            setFieldErrors(prev => ({ ...prev, [name]: null }));
        }
    }, [fieldErrors]);

    // Client-side validation
    const validateForm = useCallback(() => {
        const errors = {};

        // Estate name validation
        if (!formData.name?.trim()) {
            errors.name = 'Estate name is required';
        } else if (formData.name.trim().length < 3) {
            errors.name = 'Estate name must be at least 3 characters';
        } else if (formData.name.trim().length > 100) {
            errors.name = 'Estate name must not exceed 100 characters';
        } else if (!/^[a-zA-Z0-9\s\-.'&]+$/.test(formData.name.trim())) {
            errors.name = 'Estate name contains invalid characters';
        }

        // Admin name validation (optional but must be valid if provided)
        if (formData.adminName && formData.adminName.trim().length < 2) {
            errors.adminName = 'Admin name must be at least 2 characters';
        }

        // Email validation
        if (!formData.adminEmail?.trim()) {
            errors.adminEmail = 'Admin email is required';
        } else if (!validateEmail(formData.adminEmail)) {
            errors.adminEmail = 'Please enter a valid email address';
        }

        // Password validation
        if (!formData.adminPassword) {
            errors.adminPassword = 'Password is required';
        } else {
            const { isValid } = validatePassword(formData.adminPassword);
            if (!isValid) {
                errors.adminPassword = 'Password does not meet requirements';
            }
        }

        setFieldErrors(errors);
        return Object.keys(errors).length === 0;
    }, [formData]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        // Client-side validation first
        if (!validateForm()) {
            return;
        }

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

            const data = await response.json();

            if (!response.ok) {
                // Handle validation errors from server
                if (data.errors && Array.isArray(data.errors)) {
                    const serverErrors = {};
                    data.errors.forEach(err => {
                        if (err.field) {
                            serverErrors[err.field] = err.message;
                        }
                    });
                    setFieldErrors(serverErrors);
                }
                throw new Error(data.message || 'Failed to create estate');
            }

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
            setFieldErrors({});
        } catch (err) {
            console.error('Create estate error:', err);
            setError(err.message || 'Failed to create estate. Please check inputs.');
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
                        <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Estate Details</h3>
                        <InputField
                            label="Estate Name"
                            icon={Building2}
                            value={formData.name}
                            onChange={(e) => handleChange({ target: { name: 'name', value: e.target.value } })}
                            placeholder="e.g. Sunset Valley"
                            required
                            error={fieldErrors.name}
                            hint="3-100 characters, letters, numbers, spaces, hyphens allowed"
                        />
                        <InputField
                            label="Address"
                            icon={MapPin}
                            value={formData.address}
                            onChange={(e) => handleChange({ target: { name: 'address', value: e.target.value } })}
                            placeholder="Full address"
                            error={fieldErrors.address}
                        />
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Admin User</h3>
                        <InputField
                            label="Admin Name"
                            icon={User}
                            value={formData.adminName}
                            onChange={(e) => handleChange({ target: { name: 'adminName', value: e.target.value } })}
                            placeholder="Full name"
                            required
                            error={fieldErrors.adminName}
                        />
                        <InputField
                            label="Admin Email"
                            icon={Mail}
                            type="email"
                            value={formData.adminEmail}
                            onChange={(e) => handleChange({ target: { name: 'adminEmail', value: e.target.value } })}
                            placeholder="admin@example.com"
                            required
                            error={fieldErrors.adminEmail}
                        />
                        <div>
                            <InputField
                                label="Password"
                                icon={Lock}
                                type="password"
                                value={formData.adminPassword}
                                onChange={(e) => handleChange({ target: { name: 'adminPassword', value: e.target.value } })}
                                placeholder="Strong password"
                                required
                                error={fieldErrors.adminPassword}
                            />
                            {formData.adminPassword && (
                                <PasswordRequirements password={formData.adminPassword} />
                            )}
                        </div>
                    </div>
                </div>

                <div className="mt-6 flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-slate-700">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
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
