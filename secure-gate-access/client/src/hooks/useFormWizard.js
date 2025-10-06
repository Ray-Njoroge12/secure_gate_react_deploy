// Custom hook for managing form wizard state and validation
import { useState, useCallback, useRef } from 'react';

export const useFormWizard = (initialSteps = [], options = {}) => {
  const {
    autoSave = false,
    saveInterval = 30000, // 30 seconds
    validateOnStepChange = true,
    persistToStorage = false,
    storageKey = 'form-wizard-data'
  } = options;

  const [steps, setSteps] = useState(initialSteps);
  const [currentStep, setCurrentStep] = useState(0);
  const [stepData, setStepData] = useState({});
  const [completedSteps, setCompletedSteps] = useState(new Set());
  const [errors, setErrors] = useState({});
  const [isValidating, setIsValidating] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const autoSaveRef = useRef(null);

  // Load data from storage on mount
  useState(() => {
    if (persistToStorage) {
      const savedData = localStorage.getItem(storageKey);
      if (savedData) {
        try {
          const parsed = JSON.parse(savedData);
          setStepData(parsed.stepData || {});
          setCompletedSteps(new Set(parsed.completedSteps || []));
          setCurrentStep(parsed.currentStep || 0);
        } catch (error) {
          console.warn('Failed to load form wizard data from storage:', error);
        }
      }
    }
  }, []);

  // Auto-save functionality
  const startAutoSave = useCallback(() => {
    if (autoSave && autoSaveRef.current) {
      clearInterval(autoSaveRef.current);
    }
    
    if (autoSave) {
      autoSaveRef.current = setInterval(() => {
        if (isDirty) {
          saveToStorage();
        }
      }, saveInterval);
    }
  }, [autoSave, saveInterval, isDirty]);

  const stopAutoSave = useCallback(() => {
    if (autoSaveRef.current) {
      clearInterval(autoSaveRef.current);
      autoSaveRef.current = null;
    }
  }, []);

  // Save to storage
  const saveToStorage = useCallback(() => {
    if (persistToStorage) {
      const dataToSave = {
        stepData,
        completedSteps: Array.from(completedSteps),
        currentStep,
        timestamp: Date.now()
      };
      
      try {
        localStorage.setItem(storageKey, JSON.stringify(dataToSave));
        setIsDirty(false);
      } catch (error) {
        console.warn('Failed to save form wizard data to storage:', error);
      }
    }
  }, [stepData, completedSteps, currentStep, persistToStorage, storageKey]);

  // Clear storage
  const clearStorage = useCallback(() => {
    if (persistToStorage) {
      localStorage.removeItem(storageKey);
    }
  }, [persistToStorage, storageKey]);

  // Update step data
  const updateStepData = useCallback((stepIndex, data) => {
    setStepData(prev => ({
      ...prev,
      [stepIndex]: { ...prev[stepIndex], ...data }
    }));
    setIsDirty(true);
  }, []);

  // Validate step
  const validateStep = useCallback(async (stepIndex, data = null) => {
    const stepConfig = steps[stepIndex];
    if (!stepConfig || !stepConfig.validate) return true;

    const dataToValidate = data || stepData[stepIndex] || {};
    setIsValidating(true);
    setErrors(prev => ({ ...prev, [stepIndex]: {} }));

    try {
      const result = await stepConfig.validate(dataToValidate);
      
      if (result === true) {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[stepIndex];
          return newErrors;
        });
        return true;
      } else if (typeof result === 'object') {
        setErrors(prev => ({ ...prev, [stepIndex]: result }));
        return false;
      }
      
      return false;
    } catch (error) {
      console.error('Step validation error:', error);
      setErrors(prev => ({ 
        ...prev, 
        [stepIndex]: { general: 'Validation failed. Please try again.' }
      }));
      return false;
    } finally {
      setIsValidating(false);
    }
  }, [steps, stepData]);

  // Go to next step
  const goToNext = useCallback(async () => {
    if (currentStep >= steps.length - 1) return false;

    // Validate current step if enabled
    if (validateOnStepChange) {
      const isValid = await validateStep(currentStep);
      if (!isValid) return false;
    }

    // Mark current step as completed
    setCompletedSteps(prev => new Set([...prev, currentStep]));
    
    // Move to next step
    const nextStep = currentStep + 1;
    setCurrentStep(nextStep);
    
    return true;
  }, [currentStep, steps.length, validateOnStepChange, validateStep]);

  // Go to previous step
  const goToPrevious = useCallback(() => {
    if (currentStep <= 0) return false;
    
    const prevStep = currentStep - 1;
    setCurrentStep(prevStep);
    return true;
  }, [currentStep]);

  // Go to specific step
  const goToStep = useCallback(async (stepIndex) => {
    if (stepIndex < 0 || stepIndex >= steps.length) return false;
    
    // Validate all steps up to the target step
    if (validateOnStepChange && stepIndex > currentStep) {
      for (let i = currentStep; i < stepIndex; i++) {
        const isValid = await validateStep(i);
        if (!isValid) return false;
      }
    }
    
    setCurrentStep(stepIndex);
    return true;
  }, [currentStep, steps.length, validateOnStepChange, validateStep]);

  // Complete wizard
  const completeWizard = useCallback(async () => {
    // Validate all steps
    for (let i = 0; i < steps.length; i++) {
      const isValid = await validateStep(i);
      if (!isValid) {
        setCurrentStep(i);
        return false;
      }
    }

    // Mark all steps as completed
    setCompletedSteps(new Set(steps.map((_, index) => index)));
    
    // Clear storage
    clearStorage();
    
    return true;
  }, [steps, validateStep, clearStorage]);

  // Reset wizard
  const resetWizard = useCallback(() => {
    setStepData({});
    setCompletedSteps(new Set());
    setCurrentStep(0);
    setErrors({});
    setIsDirty(false);
    clearStorage();
  }, [clearStorage]);

  // Get step status
  const getStepStatus = useCallback((stepIndex) => {
    if (completedSteps.has(stepIndex)) return 'completed';
    if (stepIndex === currentStep) return 'current';
    if (stepIndex < currentStep) return 'completed';
    return 'upcoming';
  }, [completedSteps, currentStep]);

  // Get progress percentage
  const getProgressPercentage = useCallback(() => {
    return Math.round(((currentStep + 1) / steps.length) * 100);
  }, [currentStep, steps.length]);

  // Check if step has errors
  const hasStepErrors = useCallback((stepIndex) => {
    return errors[stepIndex] && Object.keys(errors[stepIndex]).length > 0;
  }, [errors]);

  // Get all form data
  const getAllFormData = useCallback(() => {
    return stepData;
  }, [stepData]);

  // Check if wizard is complete
  const isComplete = useCallback(() => {
    return completedSteps.size === steps.length;
  }, [completedSteps.size, steps.length]);

  // Check if can go to next step
  const canGoNext = useCallback(() => {
    return currentStep < steps.length - 1;
  }, [currentStep, steps.length]);

  // Check if can go to previous step
  const canGoPrevious = useCallback(() => {
    return currentStep > 0;
  }, [currentStep]);

  return {
    // State
    steps,
    currentStep,
    stepData,
    completedSteps,
    errors,
    isValidating,
    isDirty,
    
    // Actions
    updateStepData,
    goToNext,
    goToPrevious,
    goToStep,
    completeWizard,
    resetWizard,
    validateStep,
    saveToStorage,
    clearStorage,
    
    // Getters
    getStepStatus,
    getProgressPercentage,
    hasStepErrors,
    getAllFormData,
    isComplete,
    canGoNext,
    canGoPrevious,
    
    // Auto-save
    startAutoSave,
    stopAutoSave
  };
};

export default useFormWizard;
