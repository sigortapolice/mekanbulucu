import React from 'react';
import type { Option } from '../types';

interface SelectDropdownProps {
  id: string;
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: Option[];
  placeholder: string;
  disabled?: boolean;
}

const SelectDropdown: React.FC<SelectDropdownProps> = ({ id, label, value, onChange, options, placeholder, disabled = false }) => {
  const hasExplicitEmptyOption = options.some(opt => opt.value === '');
  
  return (
    <div className="w-full">
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
      <select
        id={id}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className="block w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-gray-300 dark:border-zinc-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-gray-100 dark:disabled:bg-zinc-700 disabled:cursor-not-allowed text-gray-900 dark:text-gray-200"
      >
        {!hasExplicitEmptyOption && <option value="" disabled>{placeholder}</option>}
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default SelectDropdown;