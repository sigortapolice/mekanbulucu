import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary';
  Icon?: React.ElementType;
}

const Button: React.FC<ButtonProps> = ({ children, variant = 'primary', Icon, className, ...props }) => {
  const baseClasses = "inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200";
  
  const variantClasses = {
    primary: "text-white bg-indigo-600 hover:bg-indigo-700",
    secondary: "text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-zinc-700 dark:text-gray-300 dark:hover:bg-zinc-600"
  };

  return (
    <button
      {...props}
      className={`${baseClasses} ${variantClasses[variant]} ${className || ''}`}
    >
      {Icon && <Icon className="w-5 h-5 mr-2 -ml-1" />}
      {children}
    </button>
  );
};

export default Button;