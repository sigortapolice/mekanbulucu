
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary';
  Icon?: React.ElementType;
}

const Button: React.FC<ButtonProps> = ({ children, variant = 'primary', Icon, ...props }) => {
  const baseClasses = "inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200";
  
  const variantClasses = {
    primary: "text-white bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500",
    secondary: "text-gray-700 bg-gray-200 hover:bg-gray-300 focus:ring-gray-400"
  };

  return (
    <button
      {...props}
      className={`${baseClasses} ${variantClasses[variant]}`}
    >
      {Icon && <Icon className="w-5 h-5 mr-2 -ml-1" />}
      {children}
    </button>
  );
};

export default Button;
