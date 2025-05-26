import React from 'react';
import { cn } from '../../utils/cn';

export const Button = ({ 
  children, 
  onClick, 
  disabled = false, 
  variant = 'primary', 
  size = 'md', 
  className = '',
  type = 'button',
  loading = false,
  icon: Icon,
  iconPosition = 'left',
  fullWidth = false,
  ...props
}) => {
  const baseClasses = cn(
    'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200',
    'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-opacity-50',
    'disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none',
    fullWidth && 'w-full'
  );
  
  const variants = {
    primary: cn(
      'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-sm',
      'hover:from-blue-600 hover:to-blue-700 hover:shadow-md hover:-translate-y-0.5',
      'focus:ring-blue-500 active:transform-none'
    ),
    secondary: cn(
      'bg-white text-gray-700 border border-gray-300 shadow-sm',
      'hover:bg-gray-50 hover:shadow-md hover:-translate-y-0.5',
      'focus:ring-gray-500'
    ),
    success: cn(
      'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-sm',
      'hover:from-green-600 hover:to-green-700 hover:shadow-md hover:-translate-y-0.5',
      'focus:ring-green-500'
    ),
    danger: cn(
      'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-sm',
      'hover:from-red-600 hover:to-red-700 hover:shadow-md hover:-translate-y-0.5',
      'focus:ring-red-500'
    ),
    warning: cn(
      'bg-gradient-to-r from-yellow-500 to-yellow-600 text-white shadow-sm',
      'hover:from-yellow-600 hover:to-yellow-700 hover:shadow-md hover:-translate-y-0.5',
      'focus:ring-yellow-500'
    ),
    ghost: cn(
      'text-gray-700 hover:bg-gray-100 hover:text-gray-900',
      'focus:ring-gray-500'
    ),
    outline: cn(
      'border-2 border-blue-500 text-blue-600 bg-transparent',
      'hover:bg-blue-50 hover:border-blue-600',
      'focus:ring-blue-500'
    )
  };
  
  const sizes = {
    xs: 'px-2.5 py-1.5 text-xs',
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base',
    xl: 'px-8 py-4 text-lg'
  };
  
  const buttonClasses = cn(
    baseClasses,
    variants[variant],
    sizes[size],
    className
  );
  
  return (
    <button
      type={type}
      className={buttonClasses}
      onClick={onClick}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      
      {Icon && iconPosition === 'left' && !loading && (
        <Icon className={cn('h-4 w-4', children && 'mr-2')} />
      )}
      
      {children}
      
      {Icon && iconPosition === 'right' && !loading && (
        <Icon className={cn('h-4 w-4', children && 'ml-2')} />
      )}
    </button>
  );
};

export default Button;