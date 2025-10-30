import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

const SelectContext = createContext();

export const Select = ({ value, onValueChange, children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedValue, setSelectedValue] = useState(value);

  const handleValueChange = (newValue) => {
    setSelectedValue(newValue);
    setIsOpen(false);
    if (onValueChange) {
      onValueChange(newValue);
    }
  };

  return (
    <SelectContext.Provider value={{ selectedValue, isOpen, setIsOpen, handleValueChange }}>
      {children}
    </SelectContext.Provider>
  );
};

export const SelectTrigger = ({ className = '', children }) => {
  const { isOpen, setIsOpen } = useContext(SelectContext);

  return (
    <button
      type="button"
      className={`flex h-10 w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      onClick={() => setIsOpen(!isOpen)}
    >
      {children}
      <ChevronDown className="h-4 w-4 opacity-50" />
    </button>
  );
};

export const SelectValue = ({ placeholder }) => {
  const { selectedValue } = useContext(SelectContext);
  return <span>{selectedValue || placeholder}</span>;
};

export const SelectContent = ({ className = '', children }) => {
  const { isOpen, setIsOpen } = useContext(SelectContext);
  const ref = useRef();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, setIsOpen]);

  if (!isOpen) return null;

  return (
    <div
      ref={ref}
      className={`absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-gray-200 bg-white py-1 shadow-lg ${className}`}
    >
      {children}
    </div>
  );
};

export const SelectItem = ({ value, children, className = '' }) => {
  const { selectedValue, handleValueChange } = useContext(SelectContext);
  const isSelected = selectedValue === value;

  return (
    <div
      className={`relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 px-2 text-sm outline-none hover:bg-gray-100 ${
        isSelected ? 'bg-gray-100 font-medium' : ''
      } ${className}`}
      onClick={() => handleValueChange(value)}
    >
      {children}
    </div>
  );
};

export default Select;
